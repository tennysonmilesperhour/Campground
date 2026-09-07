export const library = [
  {
    id: "guide-review",
    title: "A second pair of eyes",
    type: "prompt",
    description:
      "A thoughtful code review that starts with intent and ends with a smaller, safer change.",
    tags: ["code-review", "quality"],
    body: "# A second pair of eyes\n\nReview this change as a careful teammate.\n\n1. Read the surrounding code and describe the intended behavior.\n2. Trace the ordinary path, then one realistic failure path.\n3. Check authorization at the data boundary.\n4. Look for unnecessary dependencies or abstractions.\n5. Report only actionable findings, with a file location, a concrete scenario, and the smallest useful correction.\n\nDistinguish verified problems from questions. If there are no findings, say what you checked and what remains untested.\n\nFinish by suggesting one meaningful test for the highest-risk behavior.",
  },
  {
    id: "guide-handoff",
    title: "Leave a good trail",
    type: "playbook",
    description:
      "A small handoff ritual so the next person can pick up where you left off.",
    tags: ["collaboration", "documentation"],
    body: "# Leave a good trail\n\nBefore ending a working session, leave a short note containing:\n\n## What changed\nThe concrete user-visible behavior, and why it matters.\n\n## Where things live\nThe relevant files, commands, environment variable names (never secret values), and deployment URL.\n\n## What was verified\nThe checks you actually ran and their results. Label assumptions as assumptions.\n\n## What remains\nOpen decisions and the next useful action. Include enough context to proceed without reconstructing the conversation.\n\nKeep this note near the code. Remove stale instructions as the project changes.",
  },
  {
    id: "guide-boundaries",
    title: "Check the boundaries",
    type: "doc",
    description:
      "A practical field guide to testing who can read, change, and share a resource.",
    tags: ["security", "testing"],
    body: "# Check the boundaries\n\nFor each resource, test with two independent users, Alice and Bo.\n\n- Alice can create and read her own private resource.\n- Bo cannot read it by guessing its ID.\n- Bo cannot change its owner, visibility, or body.\n- A signed-out visitor cannot change anything.\n- After Alice explicitly publishes it, Bo can read it.\n- Accepting a share writes the inventory entry and receipt in one transaction.\n- Repeating the request does not create a second copy.\n- A failed request leaves neither a partial receipt nor a partial copy.\n\nDo these checks at the API or database boundary as well as in the interface. Hiding a button is not authorization.",
  },
];
export const types = ["prompt", "snippet", "playbook", "command", "doc"];
export const colors = ["#d7ac72", "#85b8a3", "#bc8b81", "#93a5c1", "#b2a0c0"];
export const parseTags = (value) =>
  [
    ...new Set(
      value
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 5);
export function relativeTime(value) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value)) / 60000),
  );
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
