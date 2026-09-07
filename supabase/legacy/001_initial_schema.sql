-- Campground Phase 1 schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ============================================================
-- PROFILES
-- Extends Supabase auth.users with app-specific fields.
-- The id column references auth.users so each profile is
-- automatically tied to a login account.
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

-- Automatically create a profile row when a new user signs up.
-- This is a Postgres function + trigger: the function runs every
-- time a row is inserted into auth.users.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- AGENTS
-- Each agent represents a project. Belongs to one user.
-- position_x and position_y store where the agent is on the map.
-- ============================================================
create table agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  current_project text not null default '',
  position_x float not null default 400,
  position_y float not null default 300,
  sprite_variant int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SKILLS
-- The tradeable goods. Each skill is a markdown-based resource.
-- type can be: prompt, snippet, playbook, command, doc
-- author_user_id tracks who originally created the skill.
-- ============================================================
create table skills (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  body text not null default '',
  type text not null default 'prompt'
    check (type in ('prompt', 'snippet', 'playbook', 'command', 'doc')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- INVENTORIES
-- Join table: which skills each agent currently holds.
-- An agent can hold many skills, and a skill can be held by
-- many agents (since trading copies the skill, not moves it).
-- ============================================================
create table inventories (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  unique (agent_id, skill_id)
);

-- ============================================================
-- TRADES
-- Records a skill being copied from one agent to another.
-- status: proposed -> accepted -> completed, or declined.
-- ============================================================
create table trades (
  id uuid primary key default gen_random_uuid(),
  offerer_agent_id uuid not null references agents(id) on delete cascade,
  receiver_agent_id uuid not null references agents(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'completed', 'declined')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- These policies ensure users can only read and modify their
-- own data. Supabase enforces these automatically when the
-- anon key is used (which is what the frontend uses).
-- ============================================================

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table agents enable row level security;
alter table skills enable row level security;
alter table inventories enable row level security;
alter table trades enable row level security;

-- Profiles: users can read and update only their own profile
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Agents: users can CRUD only their own agents
create policy "Users can view own agents"
  on agents for select
  using (auth.uid() = user_id);

create policy "Users can create own agents"
  on agents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own agents"
  on agents for update
  using (auth.uid() = user_id);

create policy "Users can delete own agents"
  on agents for delete
  using (auth.uid() = user_id);

-- Skills: users can view all skills (needed for trading) but
-- only create/update/delete their own
create policy "Anyone can view skills"
  on skills for select
  using (true);

create policy "Users can create own skills"
  on skills for insert
  with check (auth.uid() = author_user_id);

create policy "Users can update own skills"
  on skills for update
  using (auth.uid() = author_user_id);

create policy "Users can delete own skills"
  on skills for delete
  using (auth.uid() = author_user_id);

-- Inventories: users can manage inventories for their own agents
create policy "Users can view own agent inventories"
  on inventories for select
  using (
    exists (
      select 1 from agents where agents.id = inventories.agent_id
      and agents.user_id = auth.uid()
    )
  );

create policy "Users can add to own agent inventories"
  on inventories for insert
  with check (
    exists (
      select 1 from agents where agents.id = inventories.agent_id
      and agents.user_id = auth.uid()
    )
  );

create policy "Users can remove from own agent inventories"
  on inventories for delete
  using (
    exists (
      select 1 from agents where agents.id = inventories.agent_id
      and agents.user_id = auth.uid()
    )
  );

-- Trades: users can view and manage trades involving their own agents
create policy "Users can view own trades"
  on trades for select
  using (
    exists (
      select 1 from agents where agents.user_id = auth.uid()
      and (agents.id = trades.offerer_agent_id or agents.id = trades.receiver_agent_id)
    )
  );

create policy "Users can create trades from own agents"
  on trades for insert
  with check (
    exists (
      select 1 from agents where agents.id = trades.offerer_agent_id
      and agents.user_id = auth.uid()
    )
  );

create policy "Users can update own trades"
  on trades for update
  using (
    exists (
      select 1 from agents where agents.user_id = auth.uid()
      and (agents.id = trades.offerer_agent_id or agents.id = trades.receiver_agent_id)
    )
  );
