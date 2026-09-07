import { useEffect, useRef } from "react";
import { Game, AUTO, Scale } from "phaser";
import CampgroundScene from "./CampgroundScene";
export default function CampgroundCanvas(props) {
  const host = useRef(null),
    game = useRef(null),
    latest = useRef(props);
  useEffect(() => {
    latest.current = props;
    const scene = game.current?.scene.getScene("CampgroundScene");
    if (scene?.scene.isActive()) scene.sync(props);
  }, [props]);
  useEffect(() => {
    const instance = new Game({
      type: AUTO,
      parent: host.current,
      width: 900,
      height: 600,
      backgroundColor: "#10272c",
      pixelArt: true,
      banner: false,
      scene: [CampgroundScene],
      input: { keyboard: false },
      scale: { mode: Scale.FIT, autoCenter: Scale.CENTER_BOTH },
    });
    game.current = instance;
    instance.events.on("camp-ready", (scene) => {
      instance.canvas.tabIndex = 0;
      instance.canvas.setAttribute(
        "aria-label",
        "Campground movement. Use arrow keys or W A S D to walk your selected agent.",
      );
      scene.sync(latest.current);
    });
    return () => {
      instance.destroy(true);
      game.current = null;
    };
  }, []);
  return (
    <div
      className="canvas-container"
      ref={host}
      role="img"
      aria-label="Interactive pixel-art forest campground. Select your agent and click or tap the clearing to walk. Every agent is also available in the Around the fire list."
    />
  );
}
