import { Scene } from 'phaser'

// The main Phaser scene where agents appear as sprites on the map.
//
// Phaser Scene lifecycle:
//   init(data)  - receives data passed when the scene starts
//   preload()   - load images and assets
//   create()    - set up the scene (runs once after preload)
//   update()    - runs every frame (~60 times per second)

export default class CampgroundScene extends Scene {
  constructor() {
    super('CampgroundScene')
    // Store references to agent sprites so we can update them later.
    this.agentSprites = new Map()
  }

  init(data) {
    // data.agents is the array of agent objects from Supabase,
    // passed in when the scene starts.
    this.agentData = data.agents || []
  }

  preload() {
    // No image assets yet. We will use simple colored rectangles.
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a2a2a')

    // Draw a simple ground area so the world doesn't feel completely empty.
    // This is a dark rectangle with a slightly lighter border.
    const ground = this.add.rectangle(400, 300, 760, 560, 0x1e3333)
    ground.setStrokeStyle(2, 0x2a4a4a)

    // Spawn a sprite for each agent from the database.
    this.agentData.forEach((agent) => {
      this.spawnAgent(agent)
    })
  }

  spawnAgent(agent) {
    // Create a small colored rectangle to represent the agent.
    // 24x24 pixels, amber-ish color to match the dusk palette.
    const sprite = this.add.rectangle(
      agent.position_x,
      agent.position_y,
      24, 24,
      0xd4a574
    )
    sprite.setStrokeStyle(1, 0xaa8855)

    // Show the agent's name above the sprite.
    const label = this.add.text(
      agent.position_x,
      agent.position_y - 20,
      agent.name,
      { fontSize: '11px', color: '#c8b89a', align: 'center' }
    )
    label.setOrigin(0.5)

    // Store references so we can move/update them later.
    this.agentSprites.set(agent.id, { sprite, label, data: agent })
  }

  update() {
    // Movement logic will be added in the next step.
  }
}
