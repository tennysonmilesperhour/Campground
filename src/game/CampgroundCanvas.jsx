import { useEffect, useRef } from 'react'
import { Game, AUTO, Scale } from 'phaser'
import CampgroundScene from './CampgroundScene'

// React component that creates and manages the Phaser game instance.
// Accepts an "agents" prop (array of agent objects from Supabase)
// and passes them into the Phaser scene.

export default function CampgroundCanvas({ agents }) {
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
  // This is a simple approach for Phase 1. A more sophisticated
  // version would add/remove individual sprites without restarting.
  useEffect(() => {
    if (!gameInstance.current) return

    const scene = gameInstance.current.scene.getScene('CampgroundScene')
    if (scene && scene.scene.isActive()) {
      scene.scene.restart({ agents })
    }
  }, [agents])

  return (
    <div
      ref={gameContainer}
      className="w-full max-w-[800px] aspect-[4/3] mx-auto"
    />
  )
}
