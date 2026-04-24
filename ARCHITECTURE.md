# ARCHITECTURE.md

## Stack

- **Frontend shell**: React + Vite + Tailwind CSS
- **Game canvas**: Phaser 3 (2D game framework for the browser) mounted inside a React component
- **Backend / database / auth / realtime**: Supabase
- **Hosting**: Vercel (for the frontend). Supabase is its own hosted backend.
- **Source control**: GitHub

This matches the stack Tennyson is already using on Utah Forage Map and the Geck Inspect migration, so the tooling and deployment patterns are familiar.

## High-level architecture

```
+------------------+       +----------------------+       +-------------------+
|   Browser        |       |   Vercel (frontend)  |       |   Supabase        |
|                  |       |                      |       |                   |
|   React shell    |<----->|   Static React+Vite  |<----->|   Postgres DB     |
|   + Phaser game  |       |   build              |       |   Auth            |
|   + Tailwind UI  |       |                      |       |   Realtime        |
|                  |       |                      |       |   Storage (later) |
+------------------+       +----------------------+       +-------------------+
```

- The user opens campground.app (or wherever it deploys). Vercel serves the static React app.
- The React app boots Phaser inside a canvas element for the game world.
- All persistent state (users, agents, skills, trades, inventories, positions) lives in Supabase Postgres.
- Supabase Auth handles signup and login.
- Supabase Realtime pushes updates to clients so agents belonging to other users can appear and move on everyone's screens (Phase 3).

## The four layers (build in this order)

### Layer 1: Shared resource system (the database and API)
The backbone. Without this, nothing else means anything.

Core tables (initial sketch, to be refined in Phase 1):
- **users**: Supabase auth users, with a profile row.
- **agents**: belongs to a user; has a name, description, current_project, position_x, position_y, mode (autonomous | avatar), sprite_variant.
- **tags**: the "clothes." Things like "supabase-auth," "stripe-webhooks," "mapbox-integration." Many-to-many with agents.
- **skills**: the tradeable goods. Each has a title, description, body (markdown), author_user_id, created_at, type (prompt | snippet | playbook | command | doc).
- **inventories**: join table; which skills each agent currently holds.
- **trades**: a record of a skill being copied from one agent to another. Tracks offerer, receiver, skill_id, status (proposed | accepted | completed | declined), timestamps.
- **sessions**: who is currently "in the world" (for Phase 3 realtime).

All access goes through Supabase row-level security policies so users can only modify their own agents and inventories.

### Layer 2: The visual world (Phaser in React)
A React component called `<CampgroundCanvas />` mounts a Phaser scene into a div. The Phaser scene:
- Loads a tilemap for the campground (one scene in Phase 1).
- Spawns sprites for each agent present, positioned from the database.
- Handles keyboard input for avatar mode (arrow keys or WASD).
- Renders "clothes" as sprite-sheet variants or layered accessories.
- Detects proximity between agents and emits a "near" event that the React side listens to.

React handles all non-canvas UI: login, inventory panel, trade dialog modal, agent settings. Phaser talks to React via an event bus so the two layers stay decoupled.

### Layer 3: Real-time and multi-user
- Supabase Realtime subscriptions on the `agents` table (for position) and on `trades` table (for trade events).
- Optimistic local movement with periodic position writes (not on every frame; throttled to, say, 4 writes per second).
- Presence: a lightweight "who is online" channel to avoid rendering agents for logged-out users.

### Layer 4: Autonomous behavior
Two modes per agent, toggleable:
- **Avatar mode**: user controls movement with keyboard. Trades are user-initiated.
- **Autonomous mode**: a client-side behavior loop (or, later, a server-side job) that picks a target (another agent with compatible tags), walks toward them, and opens a structured offer/ask exchange. In Phase 2 this is scripted. In Phase 4 it can optionally call Claude for richer dialogue.

Autonomous agents only run while their owner has the app open (Phase 2). A server-side worker to run them 24/7 is a Phase 4 consideration and is a non-trivial cost question.

## Key design decisions locked in

1. **Phaser over Three.js, PixiJS-direct, or custom canvas.** Phaser has the best learning resources, batteries-included tilemap support, and Tennyson can get productive with it faster using Claude Code assistance.
2. **Supabase over Firebase or a custom Node backend.** Already in the stack, already familiar.
3. **Skills stored as markdown in Postgres, not as GitHub files.** Simpler for Phase 1. A later phase can add optional GitHub sync for users who want their skills versioned.
4. **Single scene in Phase 1.** One campground map. Multiple zones come in Phase 2.
5. **No live Claude calls in Phase 1 or 2.** Keeps costs predictable.

## Open questions (to resolve in early build)

- How exactly to render "clothes" on a sprite. Layered sprites, palette swaps, or pre-baked variants per combo? Probably layered accessories for flexibility, but performance is a question.
- How much of autonomous behavior runs client-side vs. server-side (Supabase Edge Functions).
- What the tag vocabulary looks like: free-text, curated list, or hybrid.

## Deployment plan

1. Create GitHub repo `tennysonmilesperhour/campground`.
2. Scaffold with Vite + React + Tailwind.
3. Add Supabase project. Wire up auth.
4. Push to GitHub, connect to Vercel, get a dev URL live within day one.
5. Add Phaser after the scaffolding is deployed and stable.

## Local paths

- Mac mini working directory: `/Users/tennyson/dyad-apps/campground` (or wherever feels right, matching the Geck Inspect pattern).
