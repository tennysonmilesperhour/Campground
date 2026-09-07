# Campground context

Campground is a React/Vite app with a Phaser world and Supabase persistence. People bring agents representing real projects, then share useful Markdown resources. The core experience is a peaceful, dusk-lit gathering, not a dashboard or a chat room.

The September 2026 rebuild expands the original single-user prototype into a shared campground. It implements public exploration, accounts, project agents, movement, private/public packs, credited atomic copying, realtime updates, and reporting. See README.md for runtime setup and verification, PRODUCT.md and DESIGN.md for design context, and INTENT.md and IDENTITY.md for the original vision.

The original Supabase project is `nexoqtrftixmtuayxiws`, named “Mythic Labs' AI Catch Up | Campground”. It was paused when inspected. Restoration was refused because the account had reached its active free-project limit. The Vercel project `campground` had no Supabase environment variables. A hosted backend must be selected or restored before production acceptance. Do not use another application's tables or change shared auth configuration without a confirmed destination and scope.

Current tables are namespaced `camp_*`; the original Phase 1 schema is archived under `supabase/legacy/` and its data is not automatically modified. The local browser fixture is test-only and must never be used as a deployment backend.
