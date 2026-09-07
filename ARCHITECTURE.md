# Campground architecture

## Runtime

React 19 and Vite 8 serve the application shell. Phaser is lazy-loaded for the world. Supabase provides email/password auth, PostgreSQL, row-level security, and Realtime. Vercel serves the generated `dist` directory. Tailwind's base layer and the project's CSS tokens implement the visual system.

## Persistence and sharing

- `camp_agents`: owned project travelers, position, coat variant, tags, and moderation flags.
- `camp_skills`: per-agent resource snapshots. Private by default, deliberately published by their owners. Stable root IDs deduplicate collections, while source IDs and author names preserve provenance.
- `camp_trades`: completed collection receipts visible to participating account owners.
- `camp_reports`: private reports available to submitters and the Supabase project administrator.
- `camp_private.library`: canonical starter field guides, with stable roots and source attribution.

The browser receives only the public Supabase key. Client roles have no direct mutation grants. Public security-invoker RPC wrappers call narrowly scoped functions in `camp_private`; each privileged function has a fixed empty search path and checks `auth.uid()` against the relevant owner. Database constraints and row locks enforce quotas, ownership, valid positions, and one active copy per pack. Collection and its receipt commit together or roll back together.

The Campground migration preserves existing application tables. The shared integration adds a Vibe Check deletion guard and allows callbacks to both apps. The earlier Phase 1 schema is preserved under `supabase/legacy` and legacy data remains untouched pending inspection.

## World lifecycle

The React wrapper creates one Phaser game and synchronizes data without restarting the scene. Scene-owned handlers are removed on shutdown. Keyboard input is ignored inside editable controls and while dialogs are open. Movement is normalized by elapsed time, available by touch, and bounded to the clearing. Saves are serialized and coalesced so out-of-order requests cannot overwrite newer movement.

Realtime position updates patch the agent collection directly. Resource changes trigger a debounced refresh; periodic polling and window focus provide recovery after missed events. RLS is the authority for subscription visibility. Presence counts signed-in people using a separate transient channel. No AI inference or autonomous movement runs in the background.

## Verification and deployment boundary

Database tests execute the real migration in PostgreSQL through PGlite. A loopback-only Auth/REST test adapter drives browser flows without production data. It does not test hosted email delivery or Realtime transport. Hosted checks additionally verified two authenticated clients, private/public isolation, atomic copying, Realtime, and shared-account deletion on the active Vibe Check project. Browser verification covered hosted login and field-guide collection. Custom SMTP is still needed for public signup and recovery.
