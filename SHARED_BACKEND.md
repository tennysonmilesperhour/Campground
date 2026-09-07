# Shared backend

The owner selected the existing active Supabase project `xyhbuqsxglfjbounogdz` (Vibe Check) for all four apps on September 7, 2026.

| App | Storage | Authentication |
| --- | --- | --- |
| Campground | `camp_agents`, `camp_skills`, `camp_trades`, `camp_reports`; private `camp_private` functions and guides | Shared Supabase Auth |
| Vibe Check | Existing private journals, profiles, people, readings, AI quota | Shared Supabase Auth |
| Dialogue | `dialogue_waitlist`, INSERT-only public access | No account needed for waitlist; iOS records stay on device |
| AI Catch Up | `aicu_subscribers`, INSERT-only public access | Existing signed-cookie login; workspace remains browser-local |

All public tables have RLS. Sharing a backend does not publish private journals, lists, or packs. Browser configuration uses public keys. Vercel production, preview, and development are configured for Campground, Dialogue, and AI Catch Up; Vibe Check keeps its connection.

## Operations

Migration history contains changes owned by multiple repositories. Apply reviewed migrations individually, preserving a history entry. Never reset this database or overwrite its migration history from one app's partial checkout. Campground's schema and Vibe Check's `protect_shared_accounts` migration must precede the shared-account deletion function.

Vibe Check erases only the requesting user's Vibe Check data in one transaction. If Campground records still use the identity, the shared identity stays. Otherwise Auth deletion removes it. A database trigger protects against a concurrent Campground save being cascaded away. Administrators must explicitly remove Campground data before deleting its shared Auth identity.

## Outstanding setup and historical recovery

- Email verification stays enabled. Custom SMTP is not configured, so public registration and password-recovery delivery are not launch-verified. Existing confirmed users can sign in to Campground with their Vibe Check credentials.
- Original Campground/AI Catch Up project `nexoqtrftixmtuayxiws` and original Dialogue project `ptwxbkzulstocpfhufea` remain paused. Queries timed out and the Management API backup lists are empty. The dashboard offers source backups, but Chrome blocked the attempted download. Neither was deleted, resumed, or overwritten. Their historical rows and users have **not** been migrated.
- Recover a backup or temporarily restore each source before importing historical data. Inspect schema collisions and map identities carefully. Never overwrite destination users or merge identities on an unverified email match.
- AI Catch Up had no Supabase integration in its current repository. This change gives subscriptions durable storage; it does not migrate browser-local workspaces or replace its login system.

## Verification

Campground's 8 PostgreSQL integration tests pass. Combined-schema tests verify Vibe Check deletion, preservation of other accounts and Campground records, the deletion guard, private lists, duplicate normalization, and input validation. Hosted checks verify sign-in, persistence, copying, RLS, Realtime between two clients, and app-specific deletion. Browser checks verify hosted login, collection, and signup persistence. Disposable verification rows are removed after checks.

Security advisors reported no new findings from these migrations. Existing warnings concern the intentional Vibe Check AI-quota SECURITY DEFINER function and disabled leaked-password protection. Its quota ledger intentionally has no direct read/write policies.
