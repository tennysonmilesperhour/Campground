import { Scene } from "phaser";
import { colors } from "../lib/library";
export default class CampgroundScene extends Scene {
  constructor() {
    super("CampgroundScene");
    this.entries = new Map();
    this.lastSave = 0;
    this.target = null;
    this.nearId = null;
  }
  preload() {
    this.load.image("clearing", "/art/campground.png");
  }
  create() {
    this.add.image(0, 0, "clearing").setOrigin(0).setDisplaySize(900, 600);
    this.ring = this.add
      .ellipse(0, 0, 28, 12)
      .setStrokeStyle(1.5, 0xe7c18c)
      .setVisible(false);
    this.marker = this.add
      .ellipse(0, 0, 12, 5)
      .setStrokeStyle(1, 0xe7c18c)
      .setVisible(false);
    this.input.on("pointerdown", (pointer) => {
      this.game.canvas.focus({ preventScroll: true });
      if (!this.props?.activeAgentId || this.props?.paused) return;
      const hit = [...this.entries.values()].find(
        (e) => Math.hypot(pointer.x - e.x, pointer.y - (e.y - 12)) < 22,
      );
      if (hit && hit.data.id !== this.props.activeAgentId) {
        this.props.onInspect(hit.data);
        return;
      }
      this.target = {
        x: Math.max(170, Math.min(710, pointer.x)),
        y: Math.max(175, Math.min(490, pointer.y)),
      };
      this.marker.setPosition(this.target.x, this.target.y).setVisible(true);
    });
    this.keys = new Set();
    this.onKeyDown = (event) => {
      if (
        !this.props?.activeAgentId ||
        this.props?.paused ||
        /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) ||
        document.activeElement?.isContentEditable
      )
        return;
      const key = event.key.toLowerCase();
      if (
        [
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          "w",
          "a",
          "s",
          "d",
        ].includes(key)
      ) {
        event.preventDefault();
        this.keys.add(key);
        this.target = null;
      }
    };
    this.onKeyUp = (e) => this.keys.delete(e.key.toLowerCase());
    this.onBlur = () => {
      this.keys.clear();
      this.target = null;
      this.flushPosition();
    };
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    this.events.once("shutdown", () => {
      this.flushPosition();
      window.removeEventListener("keydown", this.onKeyDown);
      window.removeEventListener("keyup", this.onKeyUp);
      window.removeEventListener("blur", this.onBlur);
      this.entries.clear();
    });
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!reduced) {
      const glow = this.add.ellipse(439, 314, 38, 18, 0xf3b555, 0.06);
      this.tweens.add({
        targets: glow,
        alpha: 0.17,
        scale: 1.2,
        duration: 1600,
        yoyo: true,
        repeat: -1,
      });
      for (let i = 0; i < 8; i++) {
        const mote = this.add.rectangle(
          180 + i * 72,
          190 + ((i * 73) % 230),
          2,
          2,
          0xc7c68f,
          0.5,
        );
        this.tweens.add({
          targets: mote,
          y: mote.y - 12,
          alpha: 0.1,
          duration: 2500 + i * 220,
          yoyo: true,
          repeat: -1,
        });
      }
    }
    this.game.events.emit("camp-ready", this);
  }
  sync(props) {
    if (this.props?.activeAgentId !== props.activeAgentId) {
      this.flushPosition();
      this.target = null;
      this.nearId = null;
      this.props?.onProximity(null);
      this.keys.clear();
      this.marker.setVisible(false);
    }
    this.props = props;
    if (props.paused) {
      this.target = null;
      this.keys.clear();
      this.flushPosition();
    }
    const ids = new Set(props.agents.map((a) => a.id));
    for (const [id, entry] of this.entries)
      if (!ids.has(id)) {
        entry.container.destroy();
        this.entries.delete(id);
      }
    props.agents.forEach((agent) => {
      let entry = this.entries.get(agent.id);
      if (
        entry &&
        (entry.data.sprite_variant !== agent.sprite_variant ||
          entry.data.name !== agent.name)
      ) {
        entry.container.destroy();
        this.entries.delete(agent.id);
        entry = null;
      }
      if (!entry) {
        const color = parseInt(
          colors[(agent.sprite_variant || 0) % colors.length].slice(1),
          16,
        );
        const g = this.add.graphics();
        g.fillStyle(0x071b20, 0.45);
        g.fillEllipse(0, 2, 22, 8);
        g.fillStyle(0x172326);
        g.fillRect(-6, -3, 5, 9);
        g.fillRect(2, -3, 5, 9);
        g.fillStyle(color);
        g.fillRect(-8, -19, 16, 18);
        g.fillRect(-10, -16, 3, 11);
        g.fillRect(8, -16, 3, 11);
        g.fillStyle(0x4b4335);
        g.fillRect(-7, -18, 5, 13);
        g.fillStyle(0xd0b498);
        g.fillRect(-5, -29, 10, 10);
        g.fillStyle(color);
        g.fillRect(-6, -30, 12, 4);
        g.fillRect(-8, -27, 16, 3);
        const label = this.add
          .text(0, -39, agent.name, {
            fontFamily: "system-ui, sans-serif",
            fontSize: "11px",
            color: "#f2e8d6",
            backgroundColor: "#10272ce6",
            padding: { x: 5, y: 3 },
          })
          .setOrigin(0.5);
        const container = this.add.container(
          agent.position_x,
          agent.position_y,
          [g, label],
        );
        container
          .setSize(40, 58)
          .setInteractive()
          .on("pointerdown", () => {
            if (!this.props?.paused) this.props?.onInspect(agent);
          });
        entry = {
          container,
          x: agent.position_x,
          y: agent.position_y,
          data: agent,
        };
        this.entries.set(agent.id, entry);
      }
      entry.data = agent;
      if (agent.id !== props.activeAgentId) {
        entry.x = agent.position_x;
        entry.y = agent.position_y;
        entry.container.setPosition(entry.x, entry.y);
      }
    });
  }
  flushPosition() {
    if (this.dirty && this.props?.activeAgentId) {
      const entry = this.entries.get(this.props.activeAgentId);
      if (entry)
        this.props.onPositionChange(
          entry.data.id,
          Math.round(entry.x),
          Math.round(entry.y),
        );
      this.dirty = false;
    }
  }
  update(time, delta) {
    const active = this.entries.get(this.props?.activeAgentId);
    this.ring?.setVisible(!!active);
    if (!active || this.props.paused) return;
    let dx =
      (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) -
      (this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0);
    let dy =
      (this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0) -
      (this.keys.has("w") || this.keys.has("arrowup") ? 1 : 0);
    if (!dx && !dy && this.target) {
      dx = this.target.x - active.x;
      dy = this.target.y - active.y;
      if (Math.hypot(dx, dy) < 3) {
        this.target = null;
        dx = dy = 0;
        this.marker.setVisible(false);
      }
    }
    const distance = Math.hypot(dx, dy);
    if (distance) {
      const step = (95 * Math.min(delta, 50)) / 1000;
      let x = Math.max(170, Math.min(710, active.x + (dx / distance) * step));
      let y = Math.max(175, Math.min(490, active.y + (dy / distance) * step));
      // Keep the fire ring clear; all available walking ground is in the clearing.
      if (
        Math.hypot(x - 439, y - 316) < 29 &&
        Math.hypot(x - 439, y - 316) <=
          Math.hypot(active.x - 439, active.y - 316)
      ) {
        this.target = null;
        x = active.x;
        y = active.y;
        this.marker.setVisible(false);
      }
      active.x = x;
      active.y = y;
      active.container.setPosition(x, y);
      this.dirty = true;
      if (time - this.lastSave > 700) {
        this.flushPosition();
        this.lastSave = time;
      }
    } else this.flushPosition();
    this.ring.setPosition(active.x, active.y + 5);
    let nearest = null,
      dist = 65;
    for (const [id, e] of this.entries) {
      const d = Math.hypot(e.x - active.x, e.y - active.y);
      if (id !== active.data.id && d < dist) {
        nearest = e.data;
        dist = d;
      }
    }
    if ((nearest?.id || null) !== this.nearId) {
      this.nearId = nearest?.id || null;
      this.props.onProximity(nearest);
    }
  }
}
