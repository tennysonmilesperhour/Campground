import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "./lib/supabase";
import { loadCamp, rpc } from "./lib/api";
import { library, colors, relativeTime, types } from "./lib/library";
import Icon from "./components/Icon";
import WorldBoundary from "./components/WorldBoundary";
import Dialog from "./components/Dialog";
import Auth from "./components/Auth";
import AgentForm from "./components/AgentForm";
import SkillForm from "./components/SkillForm";
import SkillDetail from "./components/SkillDetail";
const CampgroundCanvas = lazy(() => import("./game/CampgroundCanvas"));

function Avatar({ agent, small = false }) {
  return (
    <span
      className={`avatar ${small ? "small" : ""}`}
      style={{ "--coat": colors[(agent?.sprite_variant || 0) % colors.length] }}
      aria-hidden="true"
    >
      <span className="hat" />
      <span className="face" />
      <span className="coat" />
      <span className="boots" />
    </span>
  );
}
function ResourceCard({ skill, agent, onClick }) {
  return (
    <button className="resource-card" onClick={onClick}>
      <div className="resource-top">
        <span className={`type type-${skill.type}`}>{skill.type}</span>
        <Icon
          name={skill.visibility === "private" ? "lock" : "arrow"}
          size={16}
        />
      </div>
      <h3>{skill.title}</h3>
      <p>{skill.description}</p>
      <div className="resource-credit">
        {agent ? (
          <Avatar agent={agent} small />
        ) : (
          <Icon name="leaf" size={16} />
        )}
        <span>{agent?.name || "Campground field guides"}</span>
      </div>
    </button>
  );
}

export default function App() {
  const [session, setSession] = useState(null),
    [authReady, setAuthReady] = useState(false);
  const [camp, setCamp] = useState({ agents: [], skills: [], trades: [] });
  const [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState("");
  const [view, setView] = useState("camp"),
    [activeId, setActiveId] = useState(null);
  const [modal, setModal] = useState(null),
    [near, setNear] = useState(null);
  const [search, setSearch] = useState(""),
    [type, setType] = useState("all");
  const [toast, setToast] = useState(""),
    [connection, setConnection] = useState("connecting");
  const [online, setOnline] = useState(0);
  const version = useRef(0),
    sessionRef = useRef(null),
    moving = useRef(new Map());
  const userId = session?.user.id;
  const mine = camp.agents.filter((a) => a.user_id === userId);
  const active = mine.find((a) => a.id === activeId) || mine[0];
  const notify = useCallback((text) => setToast(text), []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(id);
  }, [toast]);
  const refresh = useCallback(async () => {
    const id = ++version.current;
    try {
      const data = await loadCamp();
      if (id === version.current) {
        setCamp(data);
        setLoadError("");
      }
    } catch (e) {
      if (id === version.current) setLoadError(e.message);
    } finally {
      if (id === version.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!supabase) {
      setTimeout(() => {
        setAuthReady(true);
        refresh();
      }, 0);
      return;
    }
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) notify(error.message);
      setSession(data.session);
      sessionRef.current = data.session;
      setAuthReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted) return;
      sessionRef.current = next;
      setSession(next);
      setAuthReady(true);
      if (event === "PASSWORD_RECOVERY")
        setModal({ kind: "auth", recovery: true });
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refresh, notify]);
  useEffect(() => {
    if (!authReady) return;
    const task = setTimeout(refresh, 0);
    if (!supabase) return () => clearTimeout(task);
    let timer;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 250);
    };
    const channel = supabase
      .channel("campground-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "camp_agents" },
        (payload) => {
          if (payload.eventType !== "UPDATE") {
            schedule();
            return;
          }
          setCamp((previous) => ({
            ...previous,
            agents: previous.agents
              .map((agent) =>
                agent.id === payload.new.id ? payload.new : agent,
              )
              .filter(
                (agent) =>
                  !agent.archived &&
                  (!agent.hidden || agent.user_id === userId),
              ),
          }));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "camp_skills" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "camp_trades" },
        schedule,
      )
      .subscribe((status) =>
        setConnection(
          status === "SUBSCRIBED"
            ? "live"
            : status === "CHANNEL_ERROR" || status === "TIMED_OUT"
              ? "retrying"
              : "connecting",
        ),
      );
    // A bounded fallback also refreshes public views whose delete events are filtered by RLS.
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(task);
      clearTimeout(timer);
      clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  }, [authReady, userId, refresh]);
  useEffect(() => {
    if (!supabase || !userId) return;
    const channel = supabase.channel("campground-presence", {
      config: { presence: { key: userId } },
    });
    channel
      .on("presence", { event: "sync" }, () =>
        setOnline(Object.keys(channel.presenceState()).length),
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ present: true });
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
  async function savePosition(id, x, y) {
    // Serialize and coalesce writes so a slow request cannot overwrite a later position.
    const entry = moving.current.get(id) || { running: false, next: null };
    entry.next = { p_agent: id, p_x: x, p_y: y };
    moving.current.set(id, entry);
    if (entry.running) return;
    entry.running = true;
    try {
      while (entry.next && sessionRef.current) {
        const args = entry.next;
        entry.next = null;
        await rpc("move_agent", args);
      }
    } catch {
      notify(
        "Your last movement could not be saved. Reconnect before leaving the camp.",
      );
    } finally {
      entry.running = false;
    }
  }
  function requireAgent() {
    if (!session) {
      setModal({ kind: "auth" });
      return false;
    }
    if (!active) {
      setModal({ kind: "agent" });
      return false;
    }
    return true;
  }
  function openResource(skill) {
    setModal({ kind: "skill", skill });
  }
  async function collect(skill, destination) {
    if (!requireAgent()) return;
    if (skill.id.startsWith("guide-"))
      await rpc("collect_guide", {
        p_guide: skill.id,
        p_receiver: destination || active.id,
      });
    else
      await rpc("collect_skill", {
        p_skill: skill.id,
        p_receiver: destination || active.id,
      });
    await refresh();
    notify(`“${skill.title}” is in your pack.`);
  }
  async function signOut() {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      notify(error.message);
      return;
    }
    setModal(null);
    setActiveId(null);
    setCamp({ agents: [], skills: [], trades: [] });
    setView("camp");
    setOnline(0);
  }
  const publicSkills = camp.skills.filter((s) => s.visibility === "public");
  const ownSkills = camp.skills.filter((s) => s.agent_id === active?.id);
  const filtered = (view === "pack" ? ownSkills : publicSkills).filter(
    (s) =>
      (type === "all" || s.type === type) &&
      `${s.title} ${s.description} ${s.tags.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const guides = library.filter(
    (s) =>
      (type === "all" || s.type === type) &&
      `${s.title} ${s.description} ${s.tags.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const selectedAgent =
    modal?.kind === "inspect" &&
    camp.agents.find((a) => a.id === modal.agent.id);
  const resource = modal?.skill;
  const resourceOwner =
    resource && mine.some((a) => a.id === resource.agent_id);
  const modalTitle =
    modal?.kind === "auth"
      ? modal.recovery
        ? "Welcome back"
        : "A place at the camp"
      : modal?.kind === "agent"
        ? modal.agent
          ? "Edit your agent"
          : "Bring an agent"
        : modal?.kind === "skillForm"
          ? modal.skill
            ? "Edit resource"
            : "What have you brought?"
          : modal?.kind === "skill"
            ? resource.title
            : modal?.kind === "inspect"
              ? selectedAgent?.name || "Traveler"
              : modal?.kind === "report"
                ? "Help keep the camp kind"
                : modal?.kind === "confirm"
                  ? modal.title
                  : modal?.kind === "account"
                    ? "Your place at camp"
                    : "Around this fire";
  const closeModal = () => setModal(null);
  const switchView = (v) => {
    setView(v);
    setSearch("");
    setType("all");
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <button
          className="wordmark"
          onClick={() => switchView("camp")}
          aria-label="Campground home"
        >
          <span className="brand-mark">
            <Icon name="fire" size={25} />
          </span>
          campground<span className="wordmark-dot">.</span>
        </button>
        <nav aria-label="Main navigation">
          {[
            ["camp", "The campground"],
            ["shelf", "Shared shelf"],
            ["pack", "My pack"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => switchView(id)}
              aria-current={view === id ? "page" : undefined}
            >
              {label}
              {id === "pack" && <Icon name="pack" size={15} />}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <span className="quiet-label">
            <span className="status-dot" /> A good place to gather
          </span>
          <button
            className={session ? "account-button" : "button small-button"}
            onClick={() => setModal({ kind: session ? "account" : "auth" })}
          >
            {session ? (
              <>
                <span className="account-initial">
                  {(session.user.user_metadata?.display_name ||
                    session.user.email ||
                    "T")[0].toUpperCase()}
                </span>
                <span>Your camp</span>
              </>
            ) : (
              "Join the camp"
            )}
            {!session && <Icon name="arrow" size={16} />}
          </button>
        </div>
      </header>
      <main id="main" className="main-content">
        <section className="page-intro">
          <div>
            <p className="eyebrow">
              <span /> The clearing · open to everyone
            </p>
            <h1>
              {view === "camp"
                ? "There’s room by the fire."
                : view === "shelf"
                  ? "Good things travel."
                  : "What you carry matters."}
            </h1>
            <p>
              {view === "camp"
                ? "Bring what you know. Find what you need. Leave a little for the next traveler."
                : view === "shelf"
                  ? "Prompts, playbooks, and useful discoveries, freely shared by people at the camp."
                  : "A collection for each project, filled with your own discoveries and things shared along the way."}
            </p>
          </div>
          <button
            className="button primary"
            onClick={() =>
              view === "pack"
                ? requireAgent() && setModal({ kind: "skillForm" })
                : session
                  ? setModal({ kind: "agent" })
                  : setModal({ kind: "auth" })
            }
          >
            <Icon name="plus" size={17} />
            {view === "pack" ? "Add a resource" : "Bring an agent"}
          </button>
        </section>
        {loadError && (
          <div className="connection-notice" role="status">
            <Icon name="leaf" />
            <p>{loadError}</p>
            <button
              className="text-button"
              onClick={() => {
                setLoading(true);
                refresh();
              }}
            >
              Try again
            </button>
          </div>
        )}
        {view === "camp" && (
          <section className="gathering" aria-label="The campground">
            <div className="world">
              <div className="world-topline">
                <span>
                  <Icon name="fire" size={15} /> The common fire
                </span>
                <span>
                  {loadError
                    ? "Reconnecting"
                    : connection === "live"
                      ? "Live campground"
                      : "Connecting"}
                  <span
                    className={`status-dot ${connection !== "live" || loadError ? "dim" : ""}`}
                  />
                </span>
              </div>
              <WorldBoundary>
                <Suspense
                  fallback={
                    <div className="world-placeholder">
                      Opening the clearing…
                    </div>
                  }
                >
                  <CampgroundCanvas
                    agents={camp.agents}
                    activeAgentId={active?.id}
                    onPositionChange={savePosition}
                    onProximity={setNear}
                    onInspect={(agent) => setModal({ kind: "inspect", agent })}
                    paused={!!modal}
                  />
                </Suspense>
              </WorldBoundary>
              {near && active && !modal && (
                <button
                  className="nearby-button"
                  onClick={() => setModal({ kind: "inspect", agent: near })}
                >
                  <Avatar agent={near} small />
                  <span>
                    You’re near {near.name}
                    <strong>
                      See what they brought <Icon name="arrow" size={15} />
                    </strong>
                  </span>
                </button>
              )}
              <div className="world-bottomline">
                <span>
                  {active ? (
                    <>
                      <span className="status-dot" /> Walking as{" "}
                      <strong>{active.name}</strong>
                    </>
                  ) : (
                    <>
                      <Icon name="leaf" size={15} /> Take a look around. Stay a
                      while.
                    </>
                  )}
                </span>
                <span className="movement-hint">
                  {active ? (
                    <>
                      <kbd>W</kbd>
                      <kbd>A</kbd>
                      <kbd>S</kbd>
                      <kbd>D</kbd> or tap to walk
                    </>
                  ) : (
                    "Select a traveler to explore their pack"
                  )}
                </span>
              </div>
            </div>
            <aside className="camp-sidebar">
              <div className="sidebar-heading">
                <h2>Around the fire</h2>
                <span className="count">{camp.agents.length}</span>
              </div>
              <p className="sidebar-intro">
                Different projects. Something in common.
              </p>
              <div className="traveler-list">
                {loading ? (
                  <div
                    className="skeleton-lines"
                    aria-label="Loading travelers"
                  >
                    <span />
                    <span />
                    <span />
                  </div>
                ) : camp.agents.length ? (
                  camp.agents.map((a) => (
                    <button
                      className={`traveler ${a.id === active?.id ? "selected" : ""}`}
                      key={a.id}
                      onClick={() => setModal({ kind: "inspect", agent: a })}
                    >
                      <Avatar agent={a} />
                      <span className="traveler-copy">
                        <strong>
                          {a.name}
                          {a.user_id === userId && (
                            <span className="you-label">you</span>
                          )}
                        </strong>
                        <span>{a.current_project}</span>
                        <span className="traveler-tags">
                          {a.tags.slice(0, 2).join(" · ") || "Here to share"}
                        </span>
                      </span>
                      <Icon name="arrow" size={15} />
                    </button>
                  ))
                ) : (
                  <div className="empty-travelers">
                    <Icon name="people" size={26} />
                    <h3>The fire is ready.</h3>
                    <p>
                      Be the first to bring a project and something worth
                      sharing.
                    </p>
                    <button
                      className="text-button"
                      onClick={() =>
                        setModal({ kind: session ? "agent" : "auth" })
                      }
                    >
                      Make yourself at home <Icon name="arrow" size={15} />
                    </button>
                  </div>
                )}
              </div>
              <div className="camp-note">
                <Icon name="leaf" size={19} />
                <div>
                  <h3>A little camp etiquette</h3>
                  <p>
                    Share generously. Credit your sources. Make space for
                    someone new.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setModal({ kind: "about" })}
                  >
                    How this place works <Icon name="arrow" size={14} />
                  </button>
                </div>
              </div>
              <div className="sidebar-bottom">
                <span className="status-dot" />
                {userId && online
                  ? `${online} ${online === 1 ? "person" : "people"} connected`
                  : "Come as you are"}
              </div>
            </aside>
          </section>
        )}
        {view === "pack" && (
          <div className="pack-toolbar">
            <label>
              Your agent
              <select
                value={active?.id || ""}
                onChange={(e) => setActiveId(e.target.value)}
                disabled={!mine.length}
              >
                <option value="" disabled>
                  Choose an agent
                </option>
                {mine.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.current_project}
                  </option>
                ))}
              </select>
            </label>
            {active && (
              <button
                className="text-button"
                onClick={() => setModal({ kind: "agent", agent: active })}
              >
                Edit agent
              </button>
            )}
            <button
              className="text-button"
              onClick={() => setModal({ kind: session ? "agent" : "auth" })}
            >
              <Icon name="plus" size={16} /> Bring another agent
            </button>
          </div>
        )}
        <section
          className="shelf-section"
          aria-label={view === "pack" ? "Your resources" : "Shared resources"}
        >
          <div className="section-heading">
            <div>
              <h2>
                {view === "pack"
                  ? active
                    ? `${active.name}’s pack`
                    : "Your journey starts here"
                  : view === "camp"
                    ? "Left on the shared shelf"
                    : "The shared shelf"}
              </h2>
              <p>
                {view === "pack"
                  ? "Saved for your project. Ready when you need them."
                  : "Take a copy. The original stays, and the knowledge goes further."}
              </p>
            </div>
            {view === "camp" ? (
              <button
                className="text-button"
                onClick={() => switchView("shelf")}
              >
                Explore the shelf <Icon name="arrow" size={16} />
              </button>
            ) : (
              <label className="search">
                <Icon name="search" size={17} />
                <input
                  aria-label="Search resources"
                  placeholder="Find a resource or tag"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            )}
          </div>
          {view !== "camp" && (
            <div className="filter-row" aria-label="Filter by resource kind">
              {["all", ...types].map((t) => (
                <button
                  key={t}
                  aria-pressed={type === t}
                  onClick={() => setType(t)}
                >
                  {t === "all"
                    ? "Everything"
                    : `${t[0].toUpperCase()}${t.slice(1)}s`}
                </button>
              ))}
            </div>
          )}
          {view === "pack" && !active ? (
            <div className="large-empty">
              <Icon name="pack" size={32} />
              <h3>Every project deserves a good pack.</h3>
              <p>
                Bring an agent to start collecting resources for what you’re
                building.
              </p>
              <button
                className="button"
                onClick={() => setModal({ kind: session ? "agent" : "auth" })}
              >
                Bring your first agent <Icon name="arrow" />
              </button>
            </div>
          ) : (
            <>
              {filtered.length > 0 && (
                <div className="resource-grid">
                  {(view === "camp" ? filtered.slice(0, 3) : filtered).map(
                    (s) => (
                      <ResourceCard
                        key={s.id}
                        skill={s}
                        agent={camp.agents.find((a) => a.id === s.agent_id)}
                        onClick={() => openResource(s)}
                      />
                    ),
                  )}
                </div>
              )}
              {view === "pack" && active && !filtered.length && (
                <div className="large-empty">
                  <Icon name="pack" size={28} />
                  <h3>
                    {search || type !== "all"
                      ? "No resources match yet."
                      : "A little space for what comes next."}
                  </h3>
                  <p>
                    {search || type !== "all"
                      ? "Try a different word or resource kind."
                      : "Add a resource of your own, or collect one from the shared shelf."}
                  </p>
                  <button
                    className="button"
                    onClick={() =>
                      search || type !== "all"
                        ? (setSearch(""), setType("all"))
                        : setModal({ kind: "skillForm" })
                    }
                  >
                    {search || type !== "all"
                      ? "Clear filters"
                      : "Add your first resource"}
                  </button>
                </div>
              )}
              {view !== "pack" && (
                <>
                  {(filtered.length > 0 || view === "shelf") && (
                    <div className="guide-heading">
                      <Icon name="leaf" size={17} />
                      <h3>From the Campground field guides</h3>
                      <span>A few things to get you started</span>
                    </div>
                  )}
                  <div className="resource-grid">
                    {guides.map((s) => (
                      <ResourceCard
                        key={s.id}
                        skill={s}
                        onClick={() => openResource(s)}
                      />
                    ))}
                  </div>
                  {!filtered.length && !guides.length && (
                    <div className="large-empty">
                      <h3>No resources match yet.</h3>
                      <p>
                        Try another word, or make room for a new contribution.
                      </p>
                      <button
                        className="text-button"
                        onClick={() => {
                          setSearch("");
                          setType("all");
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
        {session && camp.trades.length > 0 && (
          <section className="recent-shares">
            <div className="section-heading">
              <h2>A little has changed hands</h2>
              <Icon name="clock" />
            </div>
            {camp.trades.slice(0, 5).map((t) => (
              <div className="share-row" key={t.id}>
                <span className="share-symbol">
                  <Icon name="arrow" size={16} />
                </span>
                <p>
                  <strong>{t.receiver_name}</strong> collected{" "}
                  <strong>{t.skill_title}</strong> from {t.offerer_name}
                </p>
                <time dateTime={t.created_at}>
                  {relativeTime(t.created_at)}
                </time>
              </div>
            ))}
          </section>
        )}
      </main>
      <footer className="site-footer">
        <span>
          <Icon name="fire" size={16} /> A small clearing on a very big
          internet.
        </span>
        <button onClick={() => setModal({ kind: "about" })}>
          Tend the camp <Icon name="leaf" size={15} />
        </button>
        <span>Made for sharing.</span>
      </footer>
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          {toast}
          <button
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {modal && (
        <Dialog
          key={`${modal.kind}:${modal.skill?.id || modal.agent?.id || "new"}`}
          title={modalTitle}
          onClose={closeModal}
          wide={modal.kind === "skill" || modal.kind === "skillForm"}
        >
          {modal.kind === "auth" && (
            <Auth
              recovery={modal.recovery}
              onClose={() => {
                closeModal();
                refresh();
              }}
            />
          )}
          {modal.kind === "agent" && (
            <AgentForm
              agent={modal.agent}
              onSave={async (data) => {
                const id = await rpc("save_agent", {
                  p_agent: modal.agent?.id || null,
                  p_data: data,
                });
                setActiveId(id);
                await refresh();
                closeModal();
                notify(
                  modal.agent
                    ? "Your agent is updated."
                    : `${data.name} has arrived at camp.`,
                );
              }}
            />
          )}
          {modal.kind === "skillForm" && (
            <SkillForm
              skill={modal.skill}
              onSave={async (data) => {
                await rpc("save_skill", {
                  p_agent: modal.skill?.agent_id || active.id,
                  p_skill: modal.skill?.id || null,
                  p_data: data,
                });
                await refresh();
                closeModal();
                notify("Your resource is saved.");
              }}
            />
          )}
          {modal.kind === "skill" && (
            <SkillDetail
              skill={resource}
              agents={mine}
              activeAgentId={
                mine.find(
                  (a) => a.id !== resource.agent_id && a.id === active?.id,
                )?.id || mine.find((a) => a.id !== resource.agent_id)?.id
              }
              owned={resourceOwner}
              isGuide={resource.id.startsWith("guide-")}
              onCollect={(id) => collect(resource, id)}
              onEdit={() => setModal({ kind: "skillForm", skill: resource })}
              onReport={() =>
                session
                  ? setModal({ kind: "report", skill: resource })
                  : setModal({ kind: "auth" })
              }
              onRemove={() =>
                setModal({
                  kind: "confirm",
                  title: "Remove this resource?",
                  text: "It will leave this agent’s pack and the shared shelf. Copies other travelers have collected will remain.",
                  action: async () => {
                    await rpc("archive_skill", { p_skill: resource.id });
                    await refresh();
                    closeModal();
                    notify("Resource removed from your pack.");
                  },
                })
              }
            />
          )}
          {modal.kind === "inspect" && selectedAgent && (
            <>
              <div className="agent-detail">
                <Avatar agent={selectedAgent} />
                <div>
                  <p>{selectedAgent.current_project}</p>
                  <div className="tags">
                    {selectedAgent.tags.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="dialog-intro">
                {selectedAgent.description ||
                  "A traveler with a project in progress."}
              </p>
              {selectedAgent.user_id === userId && (
                <div className="inline-actions">
                  <button
                    className="button primary"
                    onClick={() => {
                      setActiveId(selectedAgent.id);
                      closeModal();
                      setView("camp");
                    }}
                  >
                    Walk as {selectedAgent.name}
                    <Icon name="arrow" />
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      setActiveId(selectedAgent.id);
                      closeModal();
                      switchView("pack");
                    }}
                  >
                    Open pack
                  </button>
                </div>
              )}
              <h3 className="subheading">
                {selectedAgent.user_id === userId
                  ? "In this pack"
                  : "Brought to share"}
              </h3>
              <div className="inventory-list">
                {camp.skills
                  .filter((s) => s.agent_id === selectedAgent.id)
                  .map((s) => (
                    <button key={s.id} onClick={() => openResource(s)}>
                      <span>
                        <span className={`type type-${s.type}`}>{s.type}</span>
                        <strong>{s.title}</strong>
                      </span>
                      <Icon name="arrow" size={16} />
                    </button>
                  ))}
                {!camp.skills.some((s) => s.agent_id === selectedAgent.id) && (
                  <p className="muted">
                    Nothing on the shared shelf yet. Every collection starts
                    somewhere.
                  </p>
                )}
              </div>
            </>
          )}
          {modal.kind === "report" && (
            <ReportForm
              onSubmit={async (reason) => {
                await rpc("report_skill", {
                  p_skill: modal.skill.id,
                  p_reason: reason,
                });
                closeModal();
                notify("Your report was saved for the camp steward to review.");
              }}
            />
          )}
          {modal.kind === "confirm" && (
            <ConfirmAction modal={modal} onClose={closeModal} />
          )}
          {modal.kind === "account" && (
            <>
              <p className="dialog-intro">
                Signed in as <strong>{session?.user.email}</strong>. Your agents
                and resources are saved with your account.
              </p>
              <div className="account-stats">
                <span>{mine.length} agents</span>
                <span>
                  {
                    camp.skills.filter((s) =>
                      mine.some((a) => a.id === s.agent_id),
                    ).length
                  }{" "}
                  resources
                </span>
              </div>
              <button className="button" onClick={signOut}>
                Sign out
              </button>
            </>
          )}
          {modal.kind === "about" && (
            <div className="about-copy">
              <p>
                Campground is a meeting place for people building things. Each
                traveler represents a real project. Their pack holds useful
                prompts, snippets, commands, playbooks, and documentation.
              </p>
              <h3>Bring something useful</h3>
              <p>
                Create an agent and add a resource to its pack. Keep it private
                for your own projects, or choose “Shared with the camp” so
                others can read and collect it.
              </p>
              <h3>Let knowledge travel</h3>
              <p>
                Walk over to another traveler or find them in the list. Open a
                resource and collect a credited copy for one of your agents.
                Nothing is taken away from the original.
              </p>
              <h3>Look after this place</h3>
              <p>
                Credit the people whose work helped you. Share only what you
                have permission to share. Keep credentials and personal
                information private. Use the report action on a resource if
                something needs a steward’s attention.
              </p>
              <p className="fine-print">
                Resources are text, never executed here. Review them before
                using them in your project. Field guides are original Campground
                resources shared under CC0.
              </p>
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
function ReportForm({ onSubmit }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        const reason = new FormData(e.currentTarget).get("reason").trim();
        setBusy(true);
        try {
          await onSubmit(reason);
        } catch (err) {
          setError(err.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="dialog-intro">
        Tell the camp steward what needs attention. Reports are private.
      </p>
      <label>
        What’s the concern?
        <textarea
          name="reason"
          required
          minLength={10}
          maxLength={1000}
          rows={5}
          placeholder="For example, exposed credentials, harmful content, or missing attribution."
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary" disabled={busy}>
        {busy ? "Saving report…" : "Send report to steward"}
      </button>
    </form>
  );
}
function ConfirmAction({ modal, onClose }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <p className="dialog-intro">{modal.text}</p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="inline-actions">
        <button
          className="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await modal.action();
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Removing…" : "Remove resource"}
        </button>
        <button className="text-button" onClick={onClose}>
          Keep resource
        </button>
      </div>
    </>
  );
}
