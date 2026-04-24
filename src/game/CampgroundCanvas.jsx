import { useEffect, useRef } from 'react'
import { Game, AUTO, Scale } from 'phaser'
import CampgroundScene from './CampgroundScene'

// This React component creates and manages the Phaser game instance.
// useRef gives us a reference to the DOM element where Phaser will render.
// useEffect runs setup code after the component mounts, and cleanup when
// it unmounts (the return function).

export default function CampgroundCanvas() {
  const gameContainer = useRef(null)
  const gameInstance = useRef(null)

  useEffect(() => {
    // Only create the game once, and only if the container div exists.
    if (gameInstance.current || !gameContainer.current) return

    gameInstance.current = new Game({
      type: AUTO,              // Let Phaser pick WebGL or Canvas
      parent: gameContainer.current,  // Mount inside our div
      width: 800,
      height: 600,
      backgroundColor: '#1a2a2a',
      scene: [CampgroundScene],
      scale: {
        mode: Scale.FIT,              // Scale to fit the container
        autoCenter: Scale.CENTER_BOTH,
      },
    })

    // Cleanup: destroy the Phaser game when this component is removed
    // from the page. This prevents memory leaks.
    return () => {
      if (gameInstance.current) {
        gameInstance.current.destroy(true)
        gameInstance.current = null
      }
    }
  }, [])

  return (
    <div
      ref={gameContainer}
      className="w-full max-w-[800px] aspect-[4/3] mx-auto"
    />
  )
}
