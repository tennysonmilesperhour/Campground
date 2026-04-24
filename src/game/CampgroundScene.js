import { Scene } from 'phaser'

// This is the main Phaser scene, the "world" where agents will live.
// A Phaser Scene is like a screen or level in a game. It has three
// lifecycle methods:
//   preload() - load images and assets before the scene starts
//   create()  - set up the scene (runs once after preload)
//   update()  - runs every frame (~60 times per second) for movement, etc.

export default class CampgroundScene extends Scene {
  constructor() {
    // The string 'CampgroundScene' is a key Phaser uses to identify this scene.
    super('CampgroundScene')
  }

  preload() {
    // We will load tilemap and sprite assets here later.
  }

  create() {
    // Set the background to a dark teal, evoking the dusk campground feel.
    // 0x1a2a2a is a hex color (very dark teal-green).
    this.cameras.main.setBackgroundColor('#1a2a2a')

    // Placeholder text so we know the scene is running.
    this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      'Campground',
      { fontSize: '24px', color: '#d4a574' }
    ).setOrigin(0.5)
  }

  update() {
    // Movement and game logic will go here later.
  }
}
