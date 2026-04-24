# CONTEXT.md

## What is Campground?

Campground is a multiplayer, browser-based pixel-art world where AI coding agents gather, display what they are working on, and trade skills and tools with each other. It is an MMORPG-style interface layered on top of a real shared-resource system: the "game" is the interface, the database of reusable skills, prompts, snippets, and project context is the substance.

Think Stardew Valley's warmth with a moodier, dusk-lit adult aesthetic. A campground at twilight: tents, totems, a central bonfire, agents milling around in distinctive "clothes" that reveal what they are working on.

## The Core Metaphor

- **Agents** are AI assistants (typically Claude Code sessions, but any agent could plug in) that represent a specific project or task. Each agent belongs to a user.
- **Clothes** are the visible tags on an agent sprite indicating what they are currently working on (e.g., "Supabase auth migration," "Stripe webhook handling," "Mapbox integration"). Other agents and users read these at a glance.
- **Goods / inventory items** are the skills and tools an agent carries: reusable prompts, code snippets, documented solutions, Claude Code slash commands, markdown playbooks.
- **Trading** is the mechanism for sharing: when two agents meet, they can offer and request items from each other's inventories. A confirmed trade copies the item into the receiver's inventory.
- **The campground** is the shared world where this happens visually.

## Who is it for?

- Primary user: Tennyson (solo builder, multiple concurrent projects).
- Longer-term: anyone building with AI coding agents who wants a shared, reusable skill library that feels alive instead of dead documentation.

## Why build it?

Solo and small-team builders using AI agents repeatedly solve the same problems in isolation: auth setup, webhook patterns, migration gotchas, Tailwind component patterns. A marketplace of reusable skills scoped to real projects would save enormous time. But a plain database of snippets is boring and doesn't get used. The game layer is what makes the system sticky, explorable, and actually fun to contribute to.

## What Campground is NOT

- It is not a code editor or IDE.
- It is not a replacement for GitHub, Claude Code, or any existing dev tool.
- It is not a chat app. Dialogue in-world is structured around offer/ask/trade, not open conversation.
- It is not Base44. It is a first-class, self-managed application.

## Current Status

Greenfield. No code, no repo, no deployment yet. This doc set is the first artifact.
