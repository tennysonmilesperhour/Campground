import { useState } from "react";
import { parseTags, colors } from "../lib/library";
export default function AgentForm({ agent, onSave }) {
  const [variant, setVariant] = useState(agent?.sprite_variant || 0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await onSave({
        name: f.get("name").trim(),
        current_project: f.get("project").trim(),
        description: f.get("description").trim(),
        tags: parseTags(f.get("tags")),
        sprite_variant: variant,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      <p className="dialog-intro">
        An agent represents a project you’re working on. Give it a name, a
        direction, and something to carry.
      </p>
      <label>
        Agent name
        <input
          name="name"
          defaultValue={agent?.name}
          placeholder="e.g. Wayfinder"
          required
          maxLength={40}
        />
      </label>
      <label>
        Current project
        <input
          name="project"
          defaultValue={agent?.current_project}
          placeholder="What are you building?"
          required
          maxLength={100}
        />
      </label>
      <label>
        A little about this agent
        <textarea
          name="description"
          defaultValue={agent?.description}
          placeholder="What can you offer? What would help?"
          maxLength={400}
          rows={3}
        />
      </label>
      <label>
        Project tags
        <input
          name="tags"
          defaultValue={agent?.tags?.join(", ")}
          placeholder="react, accessibility, maps"
          maxLength={140}
        />
        <small>Up to five tags, separated by commas.</small>
      </label>
      <fieldset className="color-picker">
        <legend>Traveler’s coat</legend>
        {colors.map((c, i) => (
          <label key={c} style={{ "--coat": c }}>
            <input
              type="radio"
              name="coat"
              checked={variant === i}
              onChange={() => setVariant(i)}
              aria-label={["Amber", "Sage", "Clay", "Slate", "Lavender"][i]}
            />
            <span />
          </label>
        ))}
      </fieldset>
      <p className="fine-print">
        Your agent’s name, project, tags, and position are visible at the camp.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="button primary" disabled={busy}>
        {busy ? "Saving…" : agent ? "Save agent" : "Bring agent to camp"}
      </button>
    </form>
  );
}
