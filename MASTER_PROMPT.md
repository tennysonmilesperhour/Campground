# MASTER_PROMPT.md

Paste this into Claude Code at the start of a fresh session when beginning work on Campground. It scopes the initial build to Phase 1 and tells Claude Code where to find the project's context.

---

## BEGIN PROMPT ---

You are helping me build a project called Campground. Before writing any code or making any changes, read these four files in this order and then summarize what you understand about the project back to me:

1. `./CONTEXT.md` - what Campground is and why it exists.
2. `./INTENT.md` - phased goals, non-goals, and the definition of success for Phase 1.
3. `./IDENTITY.md` - voice, aesthetic, and feel.
4. `./ARCHITECTURE.md` - the technical design, stack, and the four-layer build plan.
5. `./DECISIONS.md` - locked-in decisions and open questions.

After you have read them, do NOT start coding yet. Instead, give me a short summary that includes:
- Your understanding of the project in 3-4 sentences.
- Your understanding of what Phase 1 specifically requires.
- Any questions or ambiguities you want clarified before starting.
- A proposed order of small, verifiable steps for the first working day.

Important working constraints for this project:

**Scope discipline.** We are building Phase 1 only. Phase 1 is: single-user, one scene, one user can create agents, walk one around as an avatar, approach another of their own agents, and complete a trade that moves a skill between inventories, with all state persisted in Supabase. Do not start on autonomous mode, multi-user sync, clothes rendering, or live Claude calls. If you find yourself wanting to build any of those, stop and flag it instead.

**Small reversible steps.** Every change should be small enough that I can eyeball it and you can explain it in two or three sentences. Commit frequently to git with clear messages. I do not have a formal coding background, so I need to be able to follow what you are doing.

**Explain as you go.** When you make a non-obvious choice, say out loud why you made it. When you use a new library or command, explain what it does the first time. Assume I want to understand, not just ship.

**Ask before installing or adding dependencies.** If you want to add a new package beyond what the existing scaffolding includes, pause and tell me what it is and why.

**Match the existing stack.** React + Vite + Tailwind + Phaser + Supabase + Vercel + GitHub. Do not substitute any of these without asking.

**No em dashes in any written output.** Use commas, parentheses, or rewrites instead.

**Ship-over-polish bias.** Our goal is a deployed, working Phase 1 on Vercel as fast as possible. Prefer ugly-but-working over pretty-but-unfinished. The aesthetic work in IDENTITY.md matters later; right now we are building the bones.

When you are ready, please share your summary and proposed first steps, and I will confirm before you begin.

## END PROMPT ---

---

## How to use this file

1. Open a new Claude Code session in the `campground` project directory.
2. Make sure the five markdown files (`CONTEXT.md`, `INTENT.md`, `IDENTITY.md`, `ARCHITECTURE.md`, `DECISIONS.md`) are present at the root of the project.
3. Copy the text between BEGIN PROMPT and END PROMPT and paste it as your first message.
4. Wait for Claude Code to read the docs and summarize before letting it start coding.
5. If the summary reveals a misunderstanding, correct it before moving on. It is much cheaper to correct context at the start than to untangle wrong code later.
