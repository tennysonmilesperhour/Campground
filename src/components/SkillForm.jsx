import { useState } from "react";
import { parseTags, types } from "../lib/library";
export default function SkillForm({ skill, onSave }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await onSave({
        title: f.get("title").trim(),
        description: f.get("description").trim(),
        body: f.get("body").trim(),
        type: f.get("type"),
        tags: parseTags(f.get("tags")),
        visibility: f.get("visibility"),
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
        A useful prompt, a hard-won solution, a way of doing things. Leave
        enough context for someone else to use it.
      </p>
      <label>
        Title
        <input
          name="title"
          defaultValue={skill?.title}
          required
          maxLength={100}
          placeholder="Give your resource a clear name"
        />
      </label>
      <div className="form-row">
        <label>
          Kind
          <select name="type" defaultValue={skill?.type || "prompt"}>
            {types.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Visibility
          <select
            name="visibility"
            defaultValue={skill?.visibility || "private"}
          >
            <option value="private">Only my agents</option>
            <option value="public">Shared with the camp</option>
          </select>
        </label>
      </div>
      <label>
        Short description
        <textarea
          name="description"
          defaultValue={skill?.description}
          required
          rows={2}
          maxLength={300}
          placeholder="When will someone find this useful?"
        />
      </label>
      <label>
        The resource
        <textarea
          className="code-input"
          name="body"
          defaultValue={skill?.body}
          required
          rows={9}
          maxLength={50000}
          placeholder="Write or paste your resource here. Markdown is welcome."
        />
      </label>
      <label>
        Tags
        <input
          name="tags"
          defaultValue={skill?.tags?.join(", ")}
          maxLength={140}
          placeholder="testing, collaboration"
        />
      </label>
      <p className="fine-print">
        Public resources can be copied and downloaded by others. Keep secrets
        and private project details out of shared resources. Copies already
        collected remain with their recipients.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="button primary" disabled={busy}>
        {busy ? "Saving…" : skill ? "Save resource" : "Add resource to pack"}
      </button>
    </form>
  );
}
