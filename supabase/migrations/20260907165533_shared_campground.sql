-- Independent namespace: safe to install alongside existing applications.
-- Legacy Phase 1 tables are never modified or dropped by this migration.
create schema if not exists camp_private;
revoke all on schema camp_private from public, anon;
grant usage on schema camp_private to authenticated;

create table public.camp_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  current_project text not null check (length(trim(current_project)) between 1 and 100),
  description text not null default '' check (length(description) <= 400),
  tags text[] not null default '{}' check (cardinality(tags) <= 5 and length(tags::text) <= 200),
  sprite_variant integer not null default 0 check (sprite_variant between 0 and 4),
  position_x double precision not null default 340 check (position_x between 170 and 710),
  position_y double precision not null default 370 check (position_y between 175 and 490),
  archived boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index camp_agents_owner on public.camp_agents(user_id);

create table public.camp_skills (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.camp_agents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 100),
  description text not null default '' check (length(description) <= 300),
  body text not null check (length(trim(body)) between 1 and 50000),
  type text not null check (type in ('prompt','snippet','playbook','command','doc')),
  visibility text not null default 'private' check (visibility in ('private','public')),
  tags text[] not null default '{}' check (cardinality(tags) <= 5 and length(tags::text) <= 200),
  author_name text not null,
  source_skill_id uuid references public.camp_skills(id) on delete set null,
  root_skill_id uuid not null default gen_random_uuid(),
  archived boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index camp_skills_one_copy_per_pack on public.camp_skills(agent_id, root_skill_id) where not archived;
create index camp_skills_owner on public.camp_skills(user_id);
create index camp_skills_source on public.camp_skills(source_skill_id);
create index camp_skills_public on public.camp_skills(created_at desc) where visibility='public' and not archived and not hidden;

create table public.camp_trades (
  id uuid primary key default gen_random_uuid(),
  offerer_user_id uuid not null references auth.users(id) on delete cascade,
  receiver_user_id uuid not null references auth.users(id) on delete cascade,
  offerer_agent_id uuid references public.camp_agents(id) on delete set null,
  receiver_agent_id uuid references public.camp_agents(id) on delete set null,
  source_skill_id uuid references public.camp_skills(id) on delete set null,
  copied_skill_id uuid references public.camp_skills(id) on delete set null,
  offerer_name text not null,
  receiver_name text not null,
  skill_title text not null,
  status text not null default 'completed' check (status='completed'),
  created_at timestamptz not null default now()
);
create index camp_trades_offer_user on public.camp_trades(offerer_user_id,created_at desc);
create index camp_trades_receive_user on public.camp_trades(receiver_user_id,created_at desc);
create index camp_trades_offer_agent on public.camp_trades(offerer_agent_id);
create index camp_trades_receive_agent on public.camp_trades(receiver_agent_id);
create index camp_trades_source on public.camp_trades(source_skill_id);
create index camp_trades_copy on public.camp_trades(copied_skill_id);

create table public.camp_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.camp_skills(id) on delete cascade,
  reason text not null check (length(trim(reason)) between 10 and 1000),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now()
);
create index camp_reports_user on public.camp_reports(user_id, created_at desc);
create index camp_reports_skill on public.camp_reports(skill_id);

alter table public.camp_agents enable row level security;
alter table public.camp_skills enable row level security;
alter table public.camp_trades enable row level security;
alter table public.camp_reports enable row level security;
-- Clients read via RLS. All mutations go through narrowly scoped checked RPCs.
revoke all on public.camp_agents, public.camp_skills, public.camp_trades, public.camp_reports from anon, authenticated;
grant select on public.camp_agents, public.camp_skills, public.camp_trades, public.camp_reports to anon, authenticated;
create policy camp_agents_read on public.camp_agents for select to anon,authenticated using ((not archived and not hidden) or user_id=(select auth.uid()));
create policy camp_skills_read on public.camp_skills for select to anon,authenticated using (user_id=(select auth.uid()) or (visibility='public' and not archived and not hidden and exists (select 1 from public.camp_agents a where a.id=agent_id and not a.archived and not a.hidden)));
create policy camp_trades_read on public.camp_trades for select to authenticated using (offerer_user_id=(select auth.uid()) or receiver_user_id=(select auth.uid()));
create policy camp_reports_read on public.camp_reports for select to authenticated using (user_id=(select auth.uid()));

create function camp_private.save_agent(p_agent uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_id uuid; v_tags text[];
begin
 if v_user is null then raise exception 'Sign in to bring an agent.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
 v_tags:=array(select jsonb_array_elements_text(coalesce(p_data->'tags','[]'::jsonb)));
 if p_agent is null then
  if (select count(*) from public.camp_agents where user_id=v_user and not archived)>=12 then raise exception 'You can bring up to 12 agents.'; end if;
  insert into public.camp_agents(user_id,name,current_project,description,tags,sprite_variant,position_x,position_y)
  values(v_user,trim(p_data->>'name'),trim(p_data->>'current_project'),coalesce(p_data->>'description',''),v_tags,coalesce((p_data->>'sprite_variant')::int,0),280+random()*340,380+random()*60) returning id into v_id;
 else
  update public.camp_agents set name=trim(p_data->>'name'),current_project=trim(p_data->>'current_project'),description=coalesce(p_data->>'description',''),tags=v_tags,sprite_variant=coalesce((p_data->>'sprite_variant')::int,0)
   where id=p_agent and user_id=v_user and not archived and not hidden returning id into v_id;
  if v_id is null then raise exception 'This agent is not available to edit.'; end if;
 end if;
 return v_id;
end $$;

create function camp_private.move_agent(p_agent uuid,p_x double precision,p_y double precision) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to move an agent.'; end if;
 update public.camp_agents set position_x=p_x,position_y=p_y where id=p_agent and user_id=auth.uid() and not archived and not hidden;
 if not found then raise exception 'You can only move your own active agents.'; end if;
end $$;

create function camp_private.save_skill(p_agent uuid,p_skill uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_id uuid; v_author text; v_tags text[];
begin
 if v_user is null then raise exception 'Sign in to save a resource.'; end if;
 perform 1 from public.camp_agents where id=p_agent and user_id=v_user and not archived and not hidden for update;
 if not found then raise exception 'Choose one of your own active agents.'; end if;
 v_tags:=array(select jsonb_array_elements_text(coalesce(p_data->'tags','[]'::jsonb)));
 if p_skill is null then
  if (select count(*) from public.camp_skills where agent_id=p_agent and not archived)>=250 then raise exception 'This pack holds up to 250 resources.'; end if;
  select left(coalesce(nullif(raw_user_meta_data->>'display_name',''),'A traveler'),60) into v_author from auth.users where id=v_user;
  insert into public.camp_skills(agent_id,user_id,title,description,body,type,visibility,tags,author_name)
   values(p_agent,v_user,trim(p_data->>'title'),coalesce(p_data->>'description',''),trim(p_data->>'body'),p_data->>'type',coalesce(p_data->>'visibility','private'),v_tags,v_author) returning id into v_id;
 else
  update public.camp_skills set title=trim(p_data->>'title'),description=coalesce(p_data->>'description',''),body=trim(p_data->>'body'),type=p_data->>'type',visibility=coalesce(p_data->>'visibility','private'),tags=v_tags,updated_at=now()
   where id=p_skill and agent_id=p_agent and user_id=v_user and not archived and not hidden returning id into v_id;
  if v_id is null then raise exception 'This resource is not available to edit.'; end if;
 end if;
 return v_id;
end $$;

create function camp_private.collect_skill(p_skill uuid,p_receiver uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_source public.camp_skills; v_sender public.camp_agents; v_receiver public.camp_agents; v_copy uuid;
begin
 if v_user is null then raise exception 'Sign in to collect a resource.'; end if;
 -- Every collection for a pack is serialized, including quota and duplicate checks.
 select * into v_receiver from public.camp_agents where id=p_receiver and user_id=v_user and not archived and not hidden for update;
 if not found then raise exception 'Choose one of your own active agents.'; end if;
 select * into v_source from public.camp_skills where id=p_skill and not archived and not hidden for share;
 if not found or (v_source.visibility<>'public' and v_source.user_id<>v_user) then raise exception 'This resource is not available to collect.'; end if;
 select * into v_sender from public.camp_agents where id=v_source.agent_id and not archived and not hidden;
 if not found then raise exception 'This traveler is not at camp.'; end if;
 if v_sender.id=p_receiver then raise exception 'This resource is already in that pack.'; end if;
 select id into v_copy from public.camp_skills where agent_id=p_receiver and root_skill_id=v_source.root_skill_id and not archived;
 if v_copy is not null then return v_copy; end if;
 if (select count(*) from public.camp_skills where agent_id=p_receiver and not archived)>=250 then raise exception 'This pack holds up to 250 resources.'; end if;
 if (select count(*) from public.camp_trades where receiver_user_id=v_user and created_at>now()-interval '1 minute')>=60 then raise exception 'Take a moment before collecting more resources.'; end if;
 insert into public.camp_skills(agent_id,user_id,title,description,body,type,visibility,tags,author_name,source_skill_id,root_skill_id)
 values(p_receiver,v_user,v_source.title,v_source.description,v_source.body,v_source.type,'private',v_source.tags,v_source.author_name,v_source.id,v_source.root_skill_id) returning id into v_copy;
 insert into public.camp_trades(offerer_user_id,receiver_user_id,offerer_agent_id,receiver_agent_id,source_skill_id,copied_skill_id,offerer_name,receiver_name,skill_title)
 values(v_sender.user_id,v_user,v_sender.id,v_receiver.id,v_source.id,v_copy,v_sender.name,v_receiver.name,v_source.title);
 return v_copy;
end $$;

create function camp_private.archive_skill(p_skill uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to manage your pack.'; end if;
 update public.camp_skills set archived=true,updated_at=now() where id=p_skill and user_id=auth.uid();
 if not found then raise exception 'You can only remove your own resources.'; end if;
end $$;

create function camp_private.report_skill(p_skill uuid,p_reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_id uuid;
begin
 if v_user is null then raise exception 'Sign in to report a resource.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,1));
 if not exists(select 1 from public.camp_skills where id=p_skill and visibility='public' and not archived) then raise exception 'This resource is no longer shared.'; end if;
 if (select count(*) from public.camp_reports where user_id=v_user and created_at>now()-interval '1 day')>=20 then raise exception 'Your reports are saved. Please allow time for review.'; end if;
 insert into public.camp_reports(user_id,skill_id,reason) values(v_user,p_skill,trim(p_reason)) returning id into v_id;
 return v_id;
end $$;

-- Public wrappers run as the caller. Privileged implementations live outside the Data API.
create function public.camp_save_agent(p_agent uuid,p_data jsonb) returns uuid language sql security invoker set search_path='' as 'select camp_private.save_agent(p_agent,p_data)';
create function public.camp_move_agent(p_agent uuid,p_x double precision,p_y double precision) returns void language sql security invoker set search_path='' as 'select camp_private.move_agent(p_agent,p_x,p_y)';
create function public.camp_save_skill(p_agent uuid,p_skill uuid,p_data jsonb) returns uuid language sql security invoker set search_path='' as 'select camp_private.save_skill(p_agent,p_skill,p_data)';
create function public.camp_collect_skill(p_skill uuid,p_receiver uuid) returns uuid language sql security invoker set search_path='' as 'select camp_private.collect_skill(p_skill,p_receiver)';
create function public.camp_archive_skill(p_skill uuid) returns void language sql security invoker set search_path='' as 'select camp_private.archive_skill(p_skill)';
create function public.camp_report_skill(p_skill uuid,p_reason text) returns uuid language sql security invoker set search_path='' as 'select camp_private.report_skill(p_skill,p_reason)';

revoke all on all functions in schema camp_private from public,anon;
grant execute on all functions in schema camp_private to authenticated;
revoke all on function public.camp_save_agent(uuid,jsonb),public.camp_move_agent(uuid,double precision,double precision),public.camp_save_skill(uuid,uuid,jsonb),public.camp_collect_skill(uuid,uuid),public.camp_archive_skill(uuid),public.camp_report_skill(uuid,text) from public,anon;
grant execute on function public.camp_save_agent(uuid,jsonb),public.camp_move_agent(uuid,double precision,double precision),public.camp_save_skill(uuid,uuid,jsonb),public.camp_collect_skill(uuid,uuid),public.camp_archive_skill(uuid),public.camp_report_skill(uuid,text) to authenticated;

-- Realtime publication is optional in local SQL tests, required on Supabase.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.camp_agents,public.camp_skills,public.camp_trades;
 end if;
end $$;

-- Canonical field guides carry stable provenance and deduplicate per pack.
create table camp_private.library (id text primary key,root_id uuid not null default gen_random_uuid(),data jsonb not null);
revoke all on camp_private.library from public,anon,authenticated;
insert into camp_private.library(id,data) values('guide-review','{"id":"guide-review","title":"A second pair of eyes","type":"prompt","description":"A thoughtful code review that starts with intent and ends with a smaller, safer change.","tags":["code-review","quality"],"body":"# A second pair of eyes\n\nReview this change as a careful teammate.\n\n1. Read the surrounding code and describe the intended behavior.\n2. Trace the ordinary path, then one realistic failure path.\n3. Check authorization at the data boundary.\n4. Look for unnecessary dependencies or abstractions.\n5. Report only actionable findings, with a file location, a concrete scenario, and the smallest useful correction.\n\nDistinguish verified problems from questions. If there are no findings, say what you checked and what remains untested.\n\nFinish by suggesting one meaningful test for the highest-risk behavior."}'::jsonb);
insert into camp_private.library(id,data) values('guide-handoff','{"id":"guide-handoff","title":"Leave a good trail","type":"playbook","description":"A small handoff ritual so the next person can pick up where you left off.","tags":["collaboration","documentation"],"body":"# Leave a good trail\n\nBefore ending a working session, leave a short note containing:\n\n## What changed\nThe concrete user-visible behavior, and why it matters.\n\n## Where things live\nThe relevant files, commands, environment variable names (never secret values), and deployment URL.\n\n## What was verified\nThe checks you actually ran and their results. Label assumptions as assumptions.\n\n## What remains\nOpen decisions and the next useful action. Include enough context to proceed without reconstructing the conversation.\n\nKeep this note near the code. Remove stale instructions as the project changes."}'::jsonb);
insert into camp_private.library(id,data) values('guide-boundaries','{"id":"guide-boundaries","title":"Check the boundaries","type":"doc","description":"A practical field guide to testing who can read, change, and share a resource.","tags":["security","testing"],"body":"# Check the boundaries\n\nFor each resource, test with two independent users, Alice and Bo.\n\n- Alice can create and read her own private resource.\n- Bo cannot read it by guessing its ID.\n- Bo cannot change its owner, visibility, or body.\n- A signed-out visitor cannot change anything.\n- After Alice explicitly publishes it, Bo can read it.\n- Accepting a share writes the inventory entry and receipt in one transaction.\n- Repeating the request does not create a second copy.\n- A failed request leaves neither a partial receipt nor a partial copy.\n\nDo these checks at the API or database boundary as well as in the interface. Hiding a button is not authorization."}'::jsonb);
create function camp_private.collect_guide(p_guide text,p_receiver uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_guide camp_private.library; v_copy uuid;
begin
 if v_user is null then raise exception 'Sign in to collect a field guide.'; end if;
 perform 1 from public.camp_agents where id=p_receiver and user_id=v_user and not archived and not hidden for update;
 if not found then raise exception 'Choose one of your own active agents.'; end if;
 select * into v_guide from camp_private.library where id=p_guide;
 if not found then raise exception 'This field guide is not available.'; end if;
 select id into v_copy from public.camp_skills where agent_id=p_receiver and root_skill_id=v_guide.root_id and not archived;
 if v_copy is not null then return v_copy; end if;
 if (select count(*) from public.camp_skills where agent_id=p_receiver and not archived)>=250 then raise exception 'This pack holds up to 250 resources.'; end if;
 insert into public.camp_skills(agent_id,user_id,title,description,body,type,tags,author_name,root_skill_id)
 values(p_receiver,v_user,v_guide.data->>'title',v_guide.data->>'description',v_guide.data->>'body',v_guide.data->>'type',array(select jsonb_array_elements_text(v_guide.data->'tags')),'Campground field guides',v_guide.root_id) returning id into v_copy;
 return v_copy;
end $$;
create function public.camp_collect_guide(p_guide text,p_receiver uuid) returns uuid language sql security invoker set search_path='' as 'select camp_private.collect_guide(p_guide,p_receiver)';
revoke all on function camp_private.collect_guide(text,uuid),public.camp_collect_guide(text,uuid) from public,anon;
grant execute on function camp_private.collect_guide(text,uuid),public.camp_collect_guide(text,uuid) to authenticated;
