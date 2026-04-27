import { useEffect, useRef } from 'react'
import { Game, AUTO, Scale } from 'phaser'
import CampgroundScene from './CampgroundScene'

// React component that creates and manages the Phaser game instance.
// Accepts agents, the active agent ID, and callbacks for position
// changes and proximity events.

export default function CampgroundCanvas({
  agents,
  activeAgentId,
  onPositionChange,
  onProximity,
}) {
  const gameContainer = useRef(null)
  const gameInstance = useRef(null)

  useEffect(() => {
    if (gameInstance.current || !gameContainer.current) return

    gameInstance.current = new Game({
      type: AUTO,
      parent: gameContainer.current,
      width: 800,
      height: 600,
      backgroundColor: '#1a2a2a',
      scene: [CampgroundScene],
      scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
      },
    })

    return () => {
      if (gameInstance.current) {
        gameInstance.current.destroy(true)
        gameInstance.current = null
      }
    }
  }, [])

  // When agents change, restart the scene with the new data.
  useEffect(() => {
    if (!gameInstance.current) return

    const scene = gameInstance.current.scene.getScene('CampgroundScene')
    if (scene && scene.scene.isActive()) {
      scene.scene.restart({ agents, activeAgentId })
    }
  }, [agents])

  // When the active agent changes, tell the scene (without restarting).
  useEffect(() => {
    if (!gameInstance.current) return

    const scene = gameInstance.current.scene.getScene('CampgroundScene')
    if (scene && scene.setActiveAgent) {
      scene.setActiveAgent(activeAgentId)
    }
  }, [activeAgentId])

  // Keep the scene's callbacks in sync with React props.
  useEffect(() => {
    if (!gameInstance.current) return

    const scene = gameInstance.current.scene.getScene('CampgroundScene')
    if (scene) {
      scene.onPositionChange = onPositionChange || null
      scene.onProximity = onProximity || null
    }
  }, [onPositionChange, onProximity])

  return (
    <div
      ref={gameContainer}
      className="w-full max-w-[800px] aspect-[4/3] mx-auto"
    />
  )
}
