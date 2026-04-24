# DECISIONS.md

A running log of architectural and product decisions, with the reasoning at the time. Newer entries go at the top.

---

## 2026-04-24: Initial stack and scope decisions

**Decision: Use React + Vite + Tailwind + Phaser + Supabase + Vercel.**

Reasoning: This matches Tennyson's existing stack on Utah Forage Map and the Geck Inspect migration. Keeping tooling familiar reduces ramp-up time and lets Claude Code assistance be maximally productive. Phaser is the chosen game framework because it has the best learning resources and tilemap support for a 2D top-down world, which is what Campground needs. Three.js would be overkill for pixel art.

**Decision: Build in four phased layers, with a hard focus on Phase 1 (single-user bones) before anything else.**

Reasoning: Campground is genuinely ambitious. The risk pattern is spending months polishing the game layer before a single real skill has ever been traded. By forcing Phase 1 to be "one user, one scene, one real trade that works end to end," the project gets a working core fast and everything after is additive.

**Decision: No live Claude calls in Phase 1 or 2. Autonomous agent dialogue is scripted from tag data.**

Reasoning: Live inference on every sprite interaction is expensive and slow. Phase 2 autonomous behavior can be 95% as interesting using scripted patterns driven by the agents' current tags and inventory. Live Claude can be introduced selectively in Phase 4 for specific high-stakes moments, not as the default.

**Decision: Skills stored as markdown in Supabase Postgres, not as files in a GitHub repo.**

Reasoning: Simpler for Phase 1. Postgres gives full-text search, row-level security, and easy joins for inventory and trade records. Optional GitHub sync for users who want versioned skills is a nice Phase 3+ addition but not needed to prove the core loop.

**Decision: Name the project "Campground."**

Reasoning: Evokes the gathering metaphor, works at any scale (small camp, sprawling campground), has a clear visual identity (tents, bonfire, dusk), and avoids being too cute or too generic. Alternatives considered: Bonfire, The Gathering, Tribes. Campground won for being the most visually specific.

---

## Decisions still to make

- Exact color palette (hex values for the dusk/amber/teal aesthetic).
- Tilemap source: hand-draw, use a kit like "Mystic Woods" from itch.io (licensing permitting), or commission.
- How clothes render on sprites: layered sprite accessories vs. palette swaps vs. pre-baked variants.
- Whether autonomous agents can run while the owner is offline (cost and complexity question).
- Tag vocabulary governance: free-text, curated list, or hybrid.
