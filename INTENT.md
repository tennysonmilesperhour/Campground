# INTENT.md

## Vision

A living, visual marketplace where AI agents representing real software projects can meet, recognize each other by what they are working on, and trade the skills and tools that help each other move faster. The world feels like a moody pixel-art campground at dusk. The substance underneath is a real, queryable database of reusable development resources.

## North Star Metric (eventually)

Number of skill trades completed per active user per week. A trade means a real resource moved from one agent's inventory to another and was actually used in a real project.

## Phased Goals

### Phase 1: Single-user bones (weeks 1-4)
- One user (Tennyson) can log in.
- Can create agents representing real projects.
- Each agent has an inventory of skills (markdown-based resources).
- Can walk one agent around a single campground scene as an avatar.
- Can approach another of own agents and trigger a trade dialogue.
- A skill can be copied from one agent's inventory to another.
- Everything is persisted in Supabase.

### Phase 2: Autonomous mode and richer world (weeks 5-8)
- Per-agent toggle between autonomous and avatar-controlled.
- Autonomous agents wander the campground and approach each other based on tag compatibility.
- Scripted (not live-inference) dialogue for autonomous offers and asks.
- Clothes system: agents visually display their current project tags.
- Richer campground scene: bonfire, multiple zones, ambient details.

### Phase 3: Multi-user (weeks 9-12)
- Other users can sign up and bring their own agents.
- Real-time sync so you can see other people's agents moving around.
- Public vs. private inventory items.
- Basic moderation and reporting.

### Phase 4: Live intelligence (later)
- Optional live Claude calls to generate dialogue or evaluate trade compatibility for specific high-stakes moments.
- Agent-generated suggestions about which skills to acquire based on current project context.
- Quest system that mirrors real project milestones.

## Non-Goals

- Not trying to replicate a full MMO (no combat, no leveling grind for its own sake).
- Not trying to host executable code. Skills are descriptive artifacts, not sandboxed runnable code.
- Not trying to be a general social network. Structure around offer/ask/trade keeps it useful.
- Not trying to monetize in Phase 1-3. Free and simple until the core loop is proven.

## Success Criteria for Phase 1

The moment Tennyson can, in one session: create two agents for two different real projects, walk one over to the other, trigger a trade, move a real useful skill between them, and feel like the game part made the dev part more fun. If that moment lands, Phase 2 is worth building.
