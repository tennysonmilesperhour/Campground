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
    // Draw a small humanoid figure using Phaser's Graphics API.
    // Graphics lets us draw shapes (circles, rectangles, lines)
    // onto a single drawable object that moves as one unit.
    //
    // The figure is drawn relative to (0,0) and then positioned
    // at the agent's coordinates. This makes movement simpler later
    // because we just update the container's x/y.

    // Pick a body color based on sprite_variant (cycles through a
    // small palette so agents look distinct from each other).
    // Each entry is [main color, darker shade] so we don't need
    // Phaser's color utilities at runtime.
    const palette = [
      [0xd4a574, 0x9a7352], // amber
      [0x7ab8a8, 0x558576], // teal
      [0xc87e6a, 0x8f5a4b], // clay
      [0x8a9dc7, 0x61708f], // slate blue
      [0xb8a9d4, 0x847996], // lavender
    ]
    const [color, dark] = palette[agent.sprite_variant % palette.length]

    const gfx = this.add.graphics()

    // Head (circle, 7px radius)
    gfx.fillStyle(color, 1)
    gfx.fillCircle(0, -16, 7)
    gfx.lineStyle(1, dark, 1)
    gfx.strokeCircle(0, -16, 7)

    // Body (tapered rectangle, wider at shoulders)
    gfx.fillStyle(dark, 1)
    gfx.fillRect(-6, -9, 12, 14)

    // Arms (two small rectangles on either side of the body)
    gfx.fillStyle(color, 1)
    gfx.fillRect(-9, -8, 3, 10)
    gfx.fillRect(6, -8, 3, 10)

    // Legs (two small rectangles below the body)
    gfx.fillStyle(color, 1)
    gfx.fillRect(-5, 5, 4, 8)
    gfx.fillRect(1, 5, 4, 8)

    // Feet (slightly wider than legs)
    gfx.fillStyle(dark, 1)
    gfx.fillRect(-6, 12, 5, 3)
    gfx.fillRect(1, 12, 5, 3)

    // Position the whole graphic at the agent's map coordinates.
    gfx.setPosition(agent.position_x, agent.position_y)

    // Name label above the head.
    const label = this.add.text(
      agent.position_x,
      agent.position_y - 30,
      agent.name,
      { fontSize: '11px', color: '#c8b89a', align: 'center' }
    )
    label.setOrigin(0.5)

    this.agentSprites.set(agent.id, { sprite: gfx, label, data: agent })
  }

  update() {
    // Movement logic will be added in the next step.
  }
}
