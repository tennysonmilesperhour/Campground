import { useState } from "react";
import Icon from "./Icon";
export default function SkillDetail({
  skill,
  agents,
  activeAgentId,
  owned,
  isGuide,
  onCollect,
  onEdit,
  onReport,
  onRemove,
}) {
  const [destination, setDestination] = useState(
    activeAgentId || agents[0]?.id || "",
  );
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function collect() {
    setBusy(true);
    setError("");
    try {
      await onCollect(destination);
      setMessage(
        "Added to your agent’s pack. The original stays with its source.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function download() {
    const content = `${skill.body}\n\n---\nSource: ${skill.author_name || "Campground field guides"} · ${skill.title}\nShared through Campground.\n`;
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/markdown;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${skill.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 80)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="resource-meta">
        <span className={`type type-${skill.type}`}>{skill.type}</span>
        <span>From {skill.author_name || "Campground field guides"}</span>
        {skill.visibility === "private" && (
          <span>
            <Icon name="lock" size={13} /> Private
          </span>
        )}
      </div>
      <p className="dialog-intro">{skill.description}</p>
      <div className="tags">
        {skill.tags?.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <pre className="resource-body">{skill.body}</pre>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          <Icon name="check" />
          {message}
        </p>
      )}
      <div className="collect-row">
        {agents.length > 0 && (
          <label>
            Add a copy to
            <select
              aria-label="Receiving agent"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              {agents
                .filter((a) => a.id !== skill.agent_id)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        <button
          className="button primary"
          disabled={
            busy ||
            !!message ||
            (agents.length > 0 &&
              !agents.some(
                (a) => a.id === destination && a.id !== skill.agent_id,
              ))
          }
          onClick={collect}
        >
          {busy ? "Collecting…" : message ? "In your pack" : "Collect resource"}
          <Icon name="pack" />
        </button>
      </div>
      <div className="detail-actions">
        <button className="text-button" onClick={download}>
          <Icon name="download" size={16} /> Download .md
        </button>
        {owned && (
          <>
            <button className="text-button" onClick={onEdit}>
              Edit resource
            </button>
            <button className="text-button" onClick={onRemove}>
              Remove from pack
            </button>
          </>
        )}
        {!owned && !isGuide && (
          <button className="text-button" onClick={onReport}>
            <Icon name="flag" size={15} /> Report resource
          </button>
        )}
      </div>
    </>
  );
}
