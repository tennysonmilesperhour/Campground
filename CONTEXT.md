# Campground context

Campground is a React/Vite app with a Phaser world and Supabase persistence. People bring agents representing real projects, then share useful Markdown resources. The core experience is a peaceful, dusk-lit gathering, not a dashboard or a chat room.

The September 2026 rebuild expands the original single-user prototype into a shared campground. It implements public exploration, accounts, project agents, movement, private/public packs, credited atomic copying, realtime updates, and reporting. See README.md for runtime setup and verification, PRODUCT.md and DESIGN.md for design context, and INTENT.md and IDENTITY.md for the original vision.

The shared backend is the active Vibe Check Supabase project, `xyhbuqsxglfjbounogdz`, explicitly selected by the owner on September 7, 2026. Campground uses `camp_*`, Dialogue uses `dialogue_waitlist`, and AI Catch Up uses `aicu_subscribers`. Existing Vibe Check tables stay in place. Vercel environments use public keys.

Original Campground project `nexoqtrftixmtuayxiws` and Dialogue project `ptwxbkzulstocpfhufea` remain paused. Queries time out and their Management API backup lists are empty. The dashboard offers backups, but Chrome blocked the attempted export. No historical rows or identities have been imported and neither project has been deleted.

Auth is shared with Vibe Check. Callback URLs cover both apps; Vibe Check deletion preserves identities that own Campground data. Email verification remains enabled. Custom SMTP is still needed for public registration and password recovery. Existing confirmed accounts work. See SHARED_BACKEND.md.

Current tables are namespaced `camp_*`; the original Phase 1 schema is archived under `supabase/legacy/` and its data is not automatically modified. The local browser fixture is test-only and must never be used as a deployment backend.
