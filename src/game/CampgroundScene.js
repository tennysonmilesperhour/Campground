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
    // The ID of the agent currently being controlled with the keyboard.
    // null means no agent is selected. Set from React via setActiveAgent().
    this.activeAgentId = data.activeAgentId || null
  }

  preload() {
    // No image assets yet. We will use simple colored rectangles.
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a2a2a')

    // Draw a simple ground area so the world doesn't feel completely empty.
    const ground = this.add.rectangle(400, 300, 760, 560, 0x1e3333)
    ground.setStrokeStyle(2, 0x2a4a4a)

    // Spawn a sprite for each agent from the database.
    this.agentData.forEach((agent) => {
      this.spawnAgent(agent)
    })

    // Set up keyboard input for avatar movement.
    // createCursorKeys() gives us arrow keys. We add WASD manually.
    this.cursors = this.input.keyboard.createCursorKeys()
    this.wasd = {
      up: this.input.keyboard.addKey('W'),
      down: this.input.keyboard.addKey('S'),
      left: this.input.keyboard.addKey('A'),
      right: this.input.keyboard.addKey('D'),
    }

    // Track the last time we saved position to Supabase so we
    // don't write on every single frame (that would be ~60 writes
    // per second). We throttle to roughly 4 writes per second.
    this.lastPositionSave = 0
    this.SAVE_INTERVAL = 250 // milliseconds

    // A callback that React can set to receive position updates.
    // This lets us save to Supabase from the React side.
    this.onPositionChange = null

    // Proximity detection: distance (in pixels) at which two agents
    // are considered "near" each other. Used to trigger trade UI.
    this.PROXIMITY_DISTANCE = 50
    // Callback React can set to be notified when the avatar is
    // near another agent (or moves away).
    this.onProximity = null
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

  update(time) {
    if (!this.activeAgentId) return
    const entry = this.agentSprites.get(this.activeAgentId)
    if (!entry) return

    const speed = 2 // pixels per frame
    let dx = 0
    let dy = 0

    if (this.cursors.left.isDown || this.wasd.left.isDown) dx -= speed
    if (this.cursors.right.isDown || this.wasd.right.isDown) dx += speed
    if (this.cursors.up.isDown || this.wasd.up.isDown) dy -= speed
    if (this.cursors.down.isDown || this.wasd.down.isDown) dy += speed

    if (dx !== 0 || dy !== 0) {
      // Clamp to the ground area (20px to 780px, 20px to 580px).
      const newX = Math.max(20, Math.min(780, entry.sprite.x + dx))
      const newY = Math.max(20, Math.min(580, entry.sprite.y + dy))
      entry.sprite.setPosition(newX, newY)
      entry.label.setPosition(newX, newY - 30)

      // Throttled save: notify React so it can persist to Supabase.
      if (this.onPositionChange && time - this.lastPositionSave > this.SAVE_INTERVAL) {
        this.lastPositionSave = time
        this.onPositionChange(this.activeAgentId, newX, newY)
      }
    }

    // Check proximity to other agents.
    this.checkProximity(entry)
  }

  checkProximity(activeEntry) {
    let nearest = null
    let nearestDist = Infinity

    this.agentSprites.forEach((other, id) => {
      if (id === this.activeAgentId) return
      const dx = activeEntry.sprite.x - other.sprite.x
      const dy = activeEntry.sprite.y - other.sprite.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < this.PROXIMITY_DISTANCE && dist < nearestDist) {
        nearest = other.data
        nearestDist = dist
      }
    })

    // Only fire the callback when the nearest agent changes.
    const nearId = nearest ? nearest.id : null
    if (nearId !== this._lastNearAgent) {
      this._lastNearAgent = nearId
      if (this.onProximity) {
        this.onProximity(nearest)
      }
    }
  }

  // Called from React when the user selects a different avatar.
  setActiveAgent(agentId) {
    this.activeAgentId = agentId
    this._lastNearAgent = null
  }
}
