# Campground

A quiet pixel-art gathering place for people building things. Bring a project agent, carry useful prompts and playbooks, and collect credited copies from fellow travelers.

## What works

- Public exploration before sign-in, a shared shelf, and original downloadable field guides.
- Supabase email/password accounts, confirmation handling, session persistence, sign-out, and password recovery.
- Create and edit project agents with names, descriptions, tags, and distinct coats.
- Keyboard or tap-to-walk controls, saved positions, proximity discovery, and an accessible traveler list.
- Create, edit, search, filter, download, and remove Markdown resources.
- Private packs by default; deliberately publish selected resources to the camp.
- Atomic, duplicate-safe collection between accounts or your own agents. Copies preserve the original content and attribution even after the source changes.
- Realtime agent and resource updates, presence, and a periodic reconnect fallback.
- Private reporting for camp stewards, database ownership checks, quotas, and bounded input sizes.

There is no live AI inference, resource execution, chat, payment, combat, or autonomous trading. Agents move under their owners’ control.

## Run locally

Requires Node 22.12 or later.

```sh
npm ci
cp .env.local.example .env.local
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your Supabase project URL and **public** key. Never put a service-role key in a `VITE_` variable.

Without a configured backend, the interface and field guides remain readable and show a clear connection notice. It does not pretend to save work.

## Database and deployment

The current schema is `supabase/migrations/20260907165533_shared_campground.sql`. Apply it once to the selected hosted Supabase project. Every application table starts with `camp_`, and privileged function implementations live in the unexposed `camp_private` schema. Other applications’ tables and auth configuration are not changed.

The old Phase 1 schema is preserved in `supabase/legacy/001_initial_schema.sql` for reference. Existing legacy data is left intact. If the original project contains data, inspect it before importing it into the new namespaced tables; no automatic destructive migration runs.

In Supabase Auth:

1. Enable email/password signups.
2. Set the Site URL to the production origin, and add approved production, preview, and local origins to redirect URLs.
3. Configure custom SMTP for public signup and password-recovery emails. Supabase’s default mail service restricts recipients and is not sufficient for a public community.
4. Keep email verification enabled. Complete a real confirmation and recovery flow before inviting the public.

The migration adds only the Campground tables to an existing `supabase_realtime` publication. Public Realtime channels support discovery and presence; database RLS remains the authority for every read and mutation.

Vercel uses the Vite preset, `npm run build`, and `dist`. Add the two public environment variables to the appropriate deployment environments, then deploy:

```sh
vercel link --project campground
vercel deploy
# After the preview and live backend checks pass:
vercel deploy --prod
```

The deployment must use the hosted backend settings, never the loopback browser-test fixture.

## Verification

```sh
npm run check
```

This runs ESLint, eight database integration tests using real PostgreSQL in PGlite, and a production build. Tests cover anonymous reads, cross-account privacy, ownership attacks, duplicate-safe transfers, transactional rollback, snapshot preservation, input validation, private reports, and canonical field-guide attribution.

To exercise browser flows without touching production data:

```sh
npm run test:browser
```

In a separate terminal, run the app with the fixture environment:

```sh
VITE_SUPABASE_URL=http://127.0.0.1:54325 VITE_SUPABASE_ANON_KEY=local-test-key npm run dev -- --host 127.0.0.1
```

Use `alice@camp.test` or `bo@camp.test`, password `camp-test-password`. These are disposable local fixtures. The fixture runs the real migration and RLS, emulates only the Auth/REST endpoints needed for UI tests, and binds to loopback. It does not emulate Supabase’s mail delivery or Realtime transport. Restarting it resets test data and requires signing in again.

Browser acceptance flow: sign in, bring an agent, add a private resource, edit it to public, collect another account’s resource, reopen My pack, search, download, sign out, and check that private resources are hidden. Verify movement saves, refresh, keyboard focus, dialogs, and widths of 390, 768, and 1280 pixels. Hosted acceptance additionally requires real signup confirmation, password recovery, and synchronization between two independent browser sessions.

## Stewardship

Only the project administrator can moderate through the Supabase SQL editor. Reports are visible to their submitters; they are not public. Review open reports:

```sql
select r.id, r.reason, r.created_at, s.title, s.body
from public.camp_reports r
join public.camp_skills s on s.id = r.skill_id
where r.status = 'open'
order by r.created_at;
```

After reviewing a specific report, set the resource’s `hidden` flag and the report’s status as appropriate. Hiding is reversible and preserves existing copies and records. Avoid deleting user data during routine moderation. Agent `hidden` flags remove the agent and its public resources from public discovery. Quotas are enforced in the database: 12 active agents per account, 250 resources per pack, 60 collections per minute, and 20 reports per day.

## Design and assets

Read `PRODUCT.md`, `DESIGN.md`, and `IDENTITY.md`. The scene in `public/art/campground.png` was generated for this project using the built-in image-generation tool. The prompt and attribution live in `public/art/README.md`. The three original Campground field guides are offered under CC0. The UI uses Lora and DM Sans via Google Fonts, with local serif/sans-serif fallbacks.
