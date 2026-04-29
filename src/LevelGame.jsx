import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'

const W = 640, H = 480

function getStoredCharacter() {
  try { return JSON.parse(localStorage.getItem('lc_character')) ?? { type: 'emoji', value: '🐱' } }
  catch { return { type: 'emoji', value: '🐱' } }
}

// ── Level definitions ─────────────────────────────────────────────────────────

const LEVELS = [
  {
    id: 1,
    name: 'Demo',
    subtitle: 'See how it works',
    color: '#4ab0f0',
    demo: true,
  },
  {
    id: 2,
    name: 'Tutorial',
    subtitle: 'Catch 3 fish to win',
    color: '#22c55e',
    goal: 3,
    items: [{ emoji: '🐟', pts: 10 }],
    speedMin: 0.30,
    speedMax: 0.45,
    spawnDelay: 2200,
    maxOnScreen: 1,
    startDelay: 1800,
    tutorial: true,
  },
  {
    id: 3,
    name: 'Level 1',
    subtitle: 'Schools of fish',
    color: '#f59e0b',
    duration: 30,
    items: [{ emoji: '🐟', pts: 10 }],
    speedMin: 0.90,
    speedMax: 1.35,
    schools: true,
    startDelay: 1200,
  },
  { id: 4, name: 'Level 2', subtitle: 'Things get tricky',  color: '#ef4444', locked: true },
  { id: 5, name: 'Level 3', subtitle: 'Expert mode',        color: '#9966cc', locked: true },
]

// Module-level bridges (same pattern as Game.jsx)
let activeCharacter = null
let activeLevel = null
let onLevelCompleteCallback = null
let onDemoCompleteCallback = null

// ── LevelScene ────────────────────────────────────────────────────────────────

class LevelScene extends Phaser.Scene {
  constructor() { super('Level') }

  preload() {
    this.makeCircleTexture('laser', 14, '#ff0000', '#ff6666')
    this.makeGlowTexture('glow', 40)
    if (activeCharacter?.type === 'image') this.load.image('char', activeCharacter.src)
  }

  makeCircleTexture(key, r, fill, stroke) {
    const g = this.make.graphics({ x: 0, y: 0, add: false })
    g.lineStyle(2, Phaser.Display.Color.HexStringToColor(stroke.replace('#', '')).color, 1)
    g.fillStyle(Phaser.Display.Color.HexStringToColor(fill.replace('#', '')).color, 1)
    g.fillCircle(r, r, r)
    g.strokeCircle(r, r, r)
    g.generateTexture(key, r * 2, r * 2)
    g.destroy()
  }

  makeGlowTexture(key, r) {
    const g = this.make.graphics({ x: 0, y: 0, add: false })
    for (let i = r; i > 0; i -= 4) {
      g.fillStyle(0xff0000, (1 - i / r) * 0.3)
      g.fillCircle(r, r, i)
    }
    g.generateTexture(key, r * 2, r * 2)
    g.destroy()
  }

  create() {
    const cfg = this.cfg = activeLevel
    this.caught = 0
    this.score = 0
    this.gameOver = false
    this.noiseTime = 0
    this.timeLeft = cfg.duration ?? null

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0d2b)
    // Bottom strip — 90px, matching the demo screen
    this.add.rectangle(W / 2, H - 45, W, 90, 0x111130)

    if (cfg.duration) {
      // Timer-based HUD: score left, timer centre
      this.scoreTxt = this.add.text(10, 10, 'SCORE: 0', {
        fontSize: '18px', fontFamily: 'Courier New',
        color: '#4ab0f0', stroke: '#000', strokeThickness: 3,
      }).setDepth(10)
      this.timerTxt = this.add.text(W / 2, 10, String(cfg.duration), {
        fontSize: '18px', fontFamily: 'Courier New',
        color: '#ffffff', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5, 0).setDepth(10)
    } else {
      // Catch-goal HUD: item counter
      this.goalTxt = this.add.text(W / 2, 10,
        `${cfg.items[0].emoji}  0 / ${cfg.goal}`, {
          fontSize: '20px', fontFamily: 'Courier New',
          color: '#4ab0f0', stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5, 0).setDepth(10)
    }

    // Laser
    this.laser = this.add.container(W / 2, H / 3)
    this.laser.add([
      this.add.image(0, 0, 'glow').setBlendMode('ADD'),
      this.add.image(0, 0, 'laser'),
    ])
    this.laser.setDepth(5)

    // Trail
    this.trail = Array.from({ length: 8 }, (_, i) =>
      this.add.circle(0, 0, 4 - i * 0.4, 0xff0000, 0.5 - i * 0.06))

    // Cat
    this.cat = this.add.container(W / 2, H - 120)
    this.faceMaskGfx = null
    if (activeCharacter?.type === 'image') {
      const faceSize = 52
      const src = this.textures.get('char').getSourceImage()
      const scale = faceSize / Math.min(src.width, src.height)
      const img = this.add.image(0, 0, 'char').setScale(scale)
      this.faceMaskGfx = this.make.graphics()
      this.faceMaskGfx.fillStyle(0xffffff)
      this.faceMaskGfx.fillCircle(0, 0, faceSize / 2)
      img.setMask(this.faceMaskGfx.createGeometryMask())
      this.cat.add(img)
    } else {
      this.cat.add(
        this.add.text(0, 0, activeCharacter?.value ?? '🐱', { fontSize: '36px' }).setOrigin(0.5)
      )
    }
    this.cat.setDepth(4)

    // Cat AI state
    this.catState = 'WATCHING'
    this.stateTimer = 1.2
    this.laserHistory = []
    this.stalkWaypoint = { x: this.cat.x, y: this.cat.y }
    this.stalkMoving = true
    this.stalkMoveTimer = 0
    this.stalkPauseTimer = 0
    this.pounceOrigin = { x: 0, y: 0 }
    this.pounceTarget = { x: 0, y: 0 }
    this.pounceProgress = 0
    this.pounceArcDir = 1

    // Items
    this.items = this.add.group()
    this.itemLabels = []
    if (cfg.schools) {
      this.time.delayedCall(cfg.startDelay ?? 1000, () => this.spawnSchool())
    } else {
      this.time.delayedCall(cfg.startDelay ?? 0, () => {
        this.spawnItem()
        this.time.addEvent({ delay: cfg.spawnDelay, callback: this.spawnItem, callbackScope: this, loop: true })
      })
    }

    // Tutorial overlay — persistent text in the bottom strip
    if (cfg.tutorial) {
      this.tutStep = 0
      this.tutMoveDist = 0
      this.prevLX = W / 2
      this.prevLY = H / 3

      this.tutTxt = this.add.text(W / 2, H - 45,
        'Move your cursor (or drag) to guide the red laser dot', {
          fontSize: '18px', fontFamily: 'Courier New',
          color: '#aaaacc', align: 'center',
          wordWrap: { width: W - 40 },
        }).setOrigin(0.5).setDepth(20)
    }

    // Input
    this.input.on('pointermove', (ptr) => {
      if (this.gameOver) return
      this.laser.x = Phaser.Math.Clamp(ptr.x, 10, W - 10)
      this.laser.y = Phaser.Math.Clamp(ptr.y, 10, H - 10)
    })
    this.input.on('pointerdown', (ptr) => {
      if (this.gameOver) return
      this.laser.x = Phaser.Math.Clamp(ptr.x, 10, W - 10)
      this.laser.y = Phaser.Math.Clamp(ptr.y, 10, H - 10)
    })
  }

  spawnItem() {
    if (this.gameOver) return
    if (this.itemLabels.filter(l => l.hitbox?.active).length >= this.cfg.maxOnScreen) return
    const item = this.cfg.items[Phaser.Math.Between(0, this.cfg.items.length - 1)]
    const x = Phaser.Math.Between(40, W - 40)
    const hitbox = this.add.rectangle(x, -20, 36, 36, 0xffffff, 0)
    hitbox.pts = item.pts
    const sMin = item.speedMin ?? this.cfg.speedMin
    const sMax = item.speedMax ?? this.cfg.speedMax
    hitbox.speed = Phaser.Math.FloatBetween(sMin, sMax)
    this.items.add(hitbox)
    const lbl = this.add.text(x, -20, item.emoji, { fontSize: '30px' }).setOrigin(0.5)
    lbl.hitbox = hitbox
    this.itemLabels.push(lbl)
  }

  // ── School spawner ────────────────────────────────────────────────────────────

  spawnSingleFish(x, y, speed) {
    if (this.gameOver) return
    const item = this.cfg.items[0]
    const hitbox = this.add.rectangle(x, y, 36, 36, 0xffffff, 0)
    hitbox.pts = item.pts
    hitbox.speed = speed
    this.items.add(hitbox)
    const lbl = this.add.text(x, y, item.emoji, { fontSize: '30px' }).setOrigin(0.5)
    lbl.hitbox = hitbox
    this.itemLabels.push(lbl)
  }

  spawnSchool() {
    if (this.gameOver) return

    const { speedMin, speedMax } = this.cfg
    // All fish in a school share a base speed ± tiny variance so they swim together
    const baseSpeed = Phaser.Math.FloatBetween(speedMin, speedMax)
    const fish = (x, yOff = 0) => {
      const s = Phaser.Math.Clamp(baseSpeed + Phaser.Math.FloatBetween(-0.06, 0.06), speedMin, speedMax)
      this.spawnSingleFish(x, -20 + yOff, s)
    }

    const roll = Math.random()

    if (roll < 0.55) {
      // ROW of 3 — evenly spaced, slight y stagger to look natural
      const margin = 60, gap = (W - margin * 2) / 2
      for (let i = 0; i < 3; i++) {
        fish(margin + i * gap, Phaser.Math.Between(-14, 14))
      }
    } else if (roll < 0.82) {
      // WIDE ROW of 4
      const margin = 55, gap = (W - margin * 2) / 3
      for (let i = 0; i < 4; i++) {
        fish(margin + i * gap, Phaser.Math.Between(-14, 14))
      }
    } else {
      // SPLIT — 2 fish on the left, 2 on the right, gap in the middle
      fish(80,  Phaser.Math.Between(-10, 10))
      fish(185, Phaser.Math.Between(-10, 10))
      fish(455, Phaser.Math.Between(-10, 10))
      fish(560, Phaser.Math.Between(-10, 10))
    }

    this.scheduleNextSchool()
  }

  scheduleNextSchool() {
    if (this.gameOver) return
    this.time.delayedCall(Phaser.Math.Between(1800, 2800), () => this.spawnSchool())
  }

  catchItem(pts, x, y) {
    this.caught++
    this.score += pts

    if (this.scoreTxt) {
      this.scoreTxt.setText('SCORE: ' + this.score)
    } else if (this.goalTxt) {
      this.goalTxt.setText(`${this.cfg.items[0].emoji}  ${this.caught} / ${this.cfg.goal}`)
    }

    const pop = this.add.text(x, y, '+' + pts, {
      fontSize: '20px', fontFamily: 'Courier New',
      color: '#ffff00', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10)
    this.tweens.add({
      targets: pop, y: y - 60, alpha: 0, duration: 800,
      ease: 'Power2', onComplete: () => pop.destroy(),
    })

    // Tutorial message progression
    if (this.cfg.tutorial && this.tutTxt) {
      const remaining = this.cfg.goal - this.caught
      if (remaining > 0) {
        this.tutTxt.setText(this.caught === 1
          ? `Nice catch! ${remaining} more to go!`
          : `${remaining} more to go!`)
      } else {
        this.tutTxt.setText('')
      }
    }

    // Catch-goal end condition
    if (this.cfg.goal && this.caught >= this.cfg.goal) {
      this.time.delayedCall(500, () => {
        this.gameOver = true
        onLevelCompleteCallback?.({ levelId: this.cfg.id, score: this.score })
      })
    }
  }

  update(time, delta) {
    if (this.gameOver) return
    const dt = delta / 1000
    this.noiseTime += dt

    // Timer countdown (duration-based levels)
    if (this.timeLeft !== null) {
      this.timeLeft -= dt
      const secsLeft = Math.ceil(Math.max(0, this.timeLeft))
      this.timerTxt?.setText(String(secsLeft))
      this.timerTxt?.setColor(secsLeft <= 10 ? '#ff4444' : '#ffffff')
      if (this.timeLeft <= 0) {
        this.gameOver = true
        onLevelCompleteCallback?.({ levelId: this.cfg.id, score: this.score })
        return
      }
    }

    // Tutorial step 0 → 1: detect first laser movement
    if (this.cfg?.tutorial && this.tutStep === 0) {
      const dx = this.laser.x - this.prevLX
      const dy = this.laser.y - this.prevLY
      this.tutMoveDist += Math.sqrt(dx * dx + dy * dy)
      this.prevLX = this.laser.x
      this.prevLY = this.laser.y
      if (this.tutMoveDist > 50) {
        this.tutStep = 1
        this.tutTxt?.setText('The cat follows your laser — guide it toward the falling fish!')
      }
    }

    // Trail
    for (let i = this.trail.length - 1; i > 0; i--) {
      this.trail[i].x = this.trail[i - 1].x
      this.trail[i].y = this.trail[i - 1].y
    }
    this.trail[0].x = this.laser.x
    this.trail[0].y = this.laser.y

    this.updateCat(dt)

    // Items
    const toRemove = []
    this.itemLabels.forEach((lbl, idx) => {
      const hb = lbl.hitbox
      if (!hb?.active) { toRemove.push(idx); return }
      hb.y += hb.speed * dt * 60
      lbl.x = hb.x
      lbl.y = hb.y
      if (Phaser.Math.Distance.Between(this.cat.x, this.cat.y, hb.x, hb.y) < 35) {
        this.catchItem(hb.pts, hb.x, hb.y)
        lbl.destroy(); hb.destroy(); toRemove.push(idx)
      } else if (hb.y > H + 30) {
        lbl.destroy(); hb.destroy(); toRemove.push(idx)
      }
    })
    for (let i = toRemove.length - 1; i >= 0; i--) this.itemLabels.splice(toRemove[i], 1)
  }

  updateCat(dt) {
    const lx = this.laser.x, ly = this.laser.y
    this.laserHistory.push({ x: lx, y: ly })
    if (this.laserHistory.length > 90) this.laserHistory.shift()

    if (this.catState === 'WATCHING') {
      this.stateTimer -= dt
      this.cat.x += Math.sin(this.noiseTime * 3.7) * 5 * dt
      this.cat.y += Math.sin(this.noiseTime * 2.3 + 1.4) * 5 * dt
      this.cat.scaleX = lx < this.cat.x ? -1 : 1
      if (this.stateTimer <= 0) {
        this.catState = 'STALKING'
        this.stateTimer = Phaser.Math.FloatBetween(2, 4.5)
        this.stalkMoving = true
        this.stalkMoveTimer = Phaser.Math.FloatBetween(0.5, 1.2)
        this.updateWaypoint(lx, ly)
      }
    } else if (this.catState === 'STALKING') {
      this.stateTimer -= dt
      if (this.stalkMoving) {
        this.stalkMoveTimer -= dt
        const dx = this.stalkWaypoint.x - this.cat.x
        const dy = this.stalkWaypoint.y - this.cat.y
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d > 6) {
          this.cat.x += (dx / d) * 58 * dt
          this.cat.y += (dy / d) * 58 * dt
          this.cat.scaleX = dx < 0 ? -1 : 1
        }
        if (this.stalkMoveTimer <= 0 || d < 6) {
          this.stalkMoving = false
          this.stalkPauseTimer = Phaser.Math.FloatBetween(0.2, 0.7)
          this.updateWaypoint(lx, ly)
        }
      } else {
        this.stalkPauseTimer -= dt
        if (this.stalkPauseTimer <= 0) {
          this.stalkMoving = true
          this.stalkMoveTimer = Phaser.Math.FloatBetween(0.5, 1.5)
        }
      }
      if (Phaser.Math.Distance.Between(this.cat.x, this.cat.y, lx, ly) < 180 || this.stateTimer <= 0) {
        this.catState = 'POUNCING'
        const cached = this.laserHistory[Math.max(0, this.laserHistory.length - 30)]
        const dx = cached.x - this.cat.x, dy = cached.y - this.cat.y
        this.pounceOrigin = { x: this.cat.x, y: this.cat.y }
        this.pounceTarget = {
          x: Phaser.Math.Clamp(this.cat.x + dx * 1.25, 20, W - 20),
          y: Phaser.Math.Clamp(this.cat.y + dy * 1.25, 20, H - 50),
        }
        this.pounceProgress = 0
        this.pounceArcDir = Math.random() > 0.5 ? 1 : -1
        this.cat.scaleX = dx < 0 ? -1 : 1
      }
    } else if (this.catState === 'POUNCING') {
      this.pounceProgress = Math.min(1, this.pounceProgress + 3.2 * dt)
      const ease = 1 - Math.pow(1 - this.pounceProgress, 2)
      const bx = this.pounceOrigin.x + (this.pounceTarget.x - this.pounceOrigin.x) * ease
      const by = this.pounceOrigin.y + (this.pounceTarget.y - this.pounceOrigin.y) * ease
      const pdx = this.pounceTarget.x - this.pounceOrigin.x
      const pdy = this.pounceTarget.y - this.pounceOrigin.y
      const plen = Math.sqrt(pdx * pdx + pdy * pdy)
      if (plen > 1) {
        const arc = Math.sin(this.pounceProgress * Math.PI) * Math.min(plen * 0.18, 45) * this.pounceArcDir
        this.cat.x = bx + (-pdy / plen) * arc
        this.cat.y = by + (pdx / plen) * arc
      } else {
        this.cat.x = bx; this.cat.y = by
      }
      if (this.pounceProgress >= 1) {
        this.catState = 'WATCHING'
        this.stateTimer = Phaser.Math.FloatBetween(1, 2.5)
      }
    }

    this.cat.x = Phaser.Math.Clamp(this.cat.x, 20, W - 20)
    this.cat.y = Phaser.Math.Clamp(this.cat.y, 30, H - 100)
    if (this.faceMaskGfx) this.faceMaskGfx.setPosition(this.cat.x, this.cat.y)
  }

  updateWaypoint(lx, ly) {
    const angle = Math.atan2(ly - this.cat.y, lx - this.cat.x)
    const side = Math.random() > 0.5 ? 1 : -1
    const dev = Phaser.Math.FloatBetween(0.4, 1.1)
    const dist = Phaser.Math.FloatBetween(80, 160)
    this.stalkWaypoint = {
      x: Phaser.Math.Clamp(lx + Math.cos(angle + side * dev) * dist, 40, W - 40),
      y: Phaser.Math.Clamp(ly + Math.sin(angle + side * dev) * dist, 40, H - 70),
    }
  }
}

// ── DemoScene ─────────────────────────────────────────────────────────────────
//
// Runs the real cat AI (WATCHING → STALKING → POUNCING) with a fixed laser and
// a single falling fish timed to arrive at the pounce landing spot.
//
// All randomness is replaced with fixed values so the timing is deterministic:
//   Cat start:      (80,  370)
//   Laser (fixed):  (340, 265)
//   Fish:           x=360, speed=0.62 → reaches y=250 at t≈7.5s
//   WATCHING:       1.5s
//   STALKING:       4.5s (pounce fires at t≈6.0s via stateTimer only)
//   Pounce target:  ~(349, 254) — overshoot beyond laser
//   Catch:          t≈7.5s, distance ≈12px
//   Demo ends:      ~9s after catch celebration

class DemoScene extends Phaser.Scene {
  constructor() { super('Demo') }

  preload() {
    this.makeCircleTexture('laser', 14, '#ff0000', '#ff6666')
    this.makeGlowTexture('glow', 40)
    if (activeCharacter?.type === 'image') this.load.image('char', activeCharacter.src)
  }

  makeCircleTexture(key, r, fill, stroke) {
    const g = this.make.graphics({ x: 0, y: 0, add: false })
    g.lineStyle(2, Phaser.Display.Color.HexStringToColor(stroke.replace('#', '')).color, 1)
    g.fillStyle(Phaser.Display.Color.HexStringToColor(fill.replace('#', '')).color, 1)
    g.fillCircle(r, r, r)
    g.strokeCircle(r, r, r)
    g.generateTexture(key, r * 2, r * 2)
    g.destroy()
  }

  makeGlowTexture(key, r) {
    const g = this.make.graphics({ x: 0, y: 0, add: false })
    for (let i = r; i > 0; i -= 4) {
      g.fillStyle(0xff0000, (1 - i / r) * 0.3)
      g.fillCircle(r, r, i)
    }
    g.generateTexture(key, r * 2, r * 2)
    g.destroy()
  }

  create() {
    this.ended = false
    this.caught = false
    this.noiseTime = 0

    // Laser starts at screen centre, moves to fish column at t=2s.
    // Fish falls at x = W * 2/3 ≈ 427.
    this.laserX = W / 2
    this.laserY = 250
    this.fishX = Math.round(W * 2 / 3)   // 427

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0d2b)

    // Bottom strip — tall enough for 3 phase lines
    this.add.rectangle(W / 2, H - 49, W, 98, 0x111130)

    // Phase list — lines fade in as each state is entered and stay visible
    const phases = [
      { label: 'WATCHING', desc: 'the cat spots the laser and waits for its moment', color: '#4ab0f0' },
      { label: 'STALKING', desc: 'creeping closer, circling for the right angle',     color: '#aaccff' },
      { label: 'POUNCING', desc: 'launching — and overshooting past the laser!',       color: '#ff9966' },
    ]
    this.phaseTexts = phases.map((p, i) =>
      this.add.text(20, H - 90 + i * 28,
        `${p.label}  —  ${p.desc}`, {
          fontSize: '16px', fontFamily: 'Courier New', color: p.color,
        }).setAlpha(0).setDepth(25)
    )
    // WATCHING is visible from the start
    this.phaseTexts[0].setAlpha(1)

    // Skip hint — top-right corner, away from the phase list
    this.add.text(W - 10, 10, 'click to skip ›', {
      fontSize: '11px', fontFamily: 'Courier New', color: '#44446a',
    }).setOrigin(1, 0).setDepth(30)

    // Laser — starts at centre, will tween right at t=2s
    this.laserContainer = this.add.container(this.laserX, this.laserY).setDepth(5)
    this.laserContainer.add([
      this.add.image(0, 0, 'glow').setBlendMode('ADD'),
      this.add.image(0, 0, 'laser'),
    ])

    // Laser trail
    this.trail = Array.from({ length: 8 }, (_, i) =>
      this.add.circle(this.laserX, this.laserY, 4 - i * 0.4, 0xff0000, 0.45 - i * 0.055))

    // Fish falls at x=fishX, speed=0.62 (37.2 px/s)
    // Reaches y=250 at t≈7.5s — inside the post-pounce WATCHING window
    this.fishY = -30
    this.fishSpeed = 0.62
    this.fishLabel = this.add.text(this.fishX, this.fishY, '🐟', { fontSize: '30px' })
      .setOrigin(0.5).setDepth(3)

    // Laser slides from centre to fish column at t=2s (human-like repositioning)
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: this.laserContainer,
        x: this.fishX,
        duration: 1200,
        ease: 'Sine.easeInOut',
      })
    })

    // Cat
    this.cat = this.add.container(80, 370).setDepth(4)
    this.faceMaskGfx = null
    if (activeCharacter?.type === 'image') {
      const faceSize = 52
      const src = this.textures.get('char').getSourceImage()
      const scale = faceSize / Math.min(src.width, src.height)
      const img = this.add.image(0, 0, 'char').setScale(scale)
      this.faceMaskGfx = this.make.graphics()
      this.faceMaskGfx.fillStyle(0xffffff)
      this.faceMaskGfx.fillCircle(0, 0, faceSize / 2)
      img.setMask(this.faceMaskGfx.createGeometryMask())
      this.cat.add(img)
    } else {
      this.cat.add(
        this.add.text(0, 0, activeCharacter?.value ?? '🐱', { fontSize: '36px' }).setOrigin(0.5)
      )
    }

    // ── Cat AI state (deterministic fixed values, no Math.random) ──────────────
    this.catState = 'WATCHING'
    this.stateTimer = 1.5          // fixed WATCHING duration
    this.laserHistory = Array(90).fill({ x: this.laserX, y: this.laserY })
    this.stalkWaypoint = { x: 80, y: 370 }
    this.stalkMoving = true
    this.stalkMoveTimer = 0.8      // fixed move burst duration
    this.stalkPauseTimer = 0.4     // fixed pause duration
    this.pounceOrigin = { x: 0, y: 0 }
    this.pounceTarget = { x: 0, y: 0 }
    this.pounceProgress = 0
    this.pounceArcDir = 1          // fixed arc direction

    this.input.on('pointerdown', () => this.endDemo())
    // Safety net — ends even if catch never fires
    this.time.delayedCall(14000, () => this.endDemo())
  }

  showState(i) {
    if (!this.phaseTexts?.[i]) return
    this.tweens.add({ targets: this.phaseTexts[i], alpha: 1, duration: 400 })
  }

  // Deterministic waypoint: fixed 0.6 rad offset, fixed 100px distance.
  // Sends the cat on a circling approach rather than straight at the laser.
  updateWaypoint() {
    const angle = Math.atan2(this.laserY - this.cat.y, this.laserX - this.cat.x)
    const a = angle + 0.6
    this.stalkWaypoint = {
      x: Phaser.Math.Clamp(this.laserX + Math.cos(a) * 100, 40, W - 40),
      y: Phaser.Math.Clamp(this.laserY + Math.sin(a) * 100, 40, H - 70),
    }
  }

  updateCat(dt) {
    const lx = this.laserX, ly = this.laserY

    // Keep laser history full (laser is fixed so every entry is the same)
    this.laserHistory.push({ x: lx, y: ly })
    if (this.laserHistory.length > 90) this.laserHistory.shift()

    if (this.catState === 'WATCHING') {
      this.stateTimer -= dt
      // Idle fidget — same sine-wave jitter as the real game
      this.cat.x += Math.sin(this.noiseTime * 3.7) * 5 * dt
      this.cat.y += Math.sin(this.noiseTime * 2.3 + 1.4) * 5 * dt
      this.cat.scaleX = lx < this.cat.x ? -1 : 1

      if (this.stateTimer <= 0) {
        this.catState = 'STALKING'
        this.stateTimer = 4.5      // fixed stalk duration — expires at t≈6.0s
        this.stalkMoving = true
        this.stalkMoveTimer = 0.8
        this.updateWaypoint()
        this.showState(1)
      }

    } else if (this.catState === 'STALKING') {
      this.stateTimer -= dt

      if (this.stalkMoving) {
        this.stalkMoveTimer -= dt
        const dx = this.stalkWaypoint.x - this.cat.x
        const dy = this.stalkWaypoint.y - this.cat.y
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d > 6) {
          this.cat.x += (dx / d) * 58 * dt
          this.cat.y += (dy / d) * 58 * dt
          this.cat.scaleX = dx < 0 ? -1 : 1
        }
        if (this.stalkMoveTimer <= 0 || d < 6) {
          this.stalkMoving = false
          this.stalkPauseTimer = 0.4
          this.updateWaypoint()
        }
      } else {
        this.stalkPauseTimer -= dt
        if (this.stalkPauseTimer <= 0) {
          this.stalkMoving = true
          this.stalkMoveTimer = 0.8
        }
      }

      // Pounce fires ONLY on stateTimer — no distance check — for timing control
      if (this.stateTimer <= 0) {
        this.catState = 'POUNCING'
        // Commit to where the laser was 0.5s ago (same as real game)
        const cached = this.laserHistory[Math.max(0, this.laserHistory.length - 30)]
        const dx = cached.x - this.cat.x
        const dy = cached.y - this.cat.y
        this.pounceOrigin = { x: this.cat.x, y: this.cat.y }
        // 1.25× overshoot — the cat skids past the laser
        this.pounceTarget = {
          x: Phaser.Math.Clamp(this.cat.x + dx * 1.25, 20, W - 20),
          y: Phaser.Math.Clamp(this.cat.y + dy * 1.25, 20, H - 50),
        }
        this.pounceProgress = 0
        this.cat.scaleX = dx < 0 ? -1 : 1
        this.showState(2)
      }

    } else if (this.catState === 'POUNCING') {
      this.pounceProgress = Math.min(1, this.pounceProgress + 3.2 * dt)
      const ease = 1 - Math.pow(1 - this.pounceProgress, 2)
      const bx = this.pounceOrigin.x + (this.pounceTarget.x - this.pounceOrigin.x) * ease
      const by = this.pounceOrigin.y + (this.pounceTarget.y - this.pounceOrigin.y) * ease

      // Arc perpendicular to pounce direction
      const pdx = this.pounceTarget.x - this.pounceOrigin.x
      const pdy = this.pounceTarget.y - this.pounceOrigin.y
      const plen = Math.sqrt(pdx * pdx + pdy * pdy)
      if (plen > 1) {
        const arc = Math.sin(this.pounceProgress * Math.PI) * Math.min(plen * 0.18, 45) * this.pounceArcDir
        this.cat.x = bx + (-pdy / plen) * arc
        this.cat.y = by + (pdx / plen) * arc
      } else {
        this.cat.x = bx
        this.cat.y = by
      }

      if (this.pounceProgress >= 1) {
        this.catState = 'WATCHING'
        this.stateTimer = 2.5      // long post-pounce WATCHING so fish can arrive
        // No new label — all three already visible after pounce
      }
    }

    this.cat.x = Phaser.Math.Clamp(this.cat.x, 20, W - 20)
    this.cat.y = Phaser.Math.Clamp(this.cat.y, 30, H - 60)
    if (this.faceMaskGfx) this.faceMaskGfx.setPosition(this.cat.x, this.cat.y)
  }

  triggerCatch(x, y) {
    this.caught = true

    // Flash fish out
    this.fishLabel.setVisible(false)

    // +10 popup
    const pop = this.add.text(x, y, '+10', {
      fontSize: '26px', fontFamily: 'Courier New',
      color: '#ffff00', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10)
    this.tweens.add({
      targets: pop, y: y - 70, alpha: 0, duration: 900, ease: 'Power2',
      onComplete: () => pop.destroy(),
    })

    // Cat happy bounce
    this.tweens.add({ targets: this.cat, scaleY: 1.3, duration: 110, yoyo: true, repeat: 2 })

    this.time.delayedCall(3500, () => this.endDemo())
  }

  endDemo() {
    if (this.ended) return
    this.ended = true
    onDemoCompleteCallback?.()
  }

  update(time, delta) {
    if (this.ended) return
    const dt = delta / 1000
    this.noiseTime += dt

    // Sync laser position from the (possibly tweening) container
    this.laserX = this.laserContainer.x
    this.laserY = this.laserContainer.y

    this.updateCat(dt)

    // Fish physics — same formula as the real game
    this.fishY += this.fishSpeed * dt * 60
    this.fishLabel.y = this.fishY

    // Catch detection — slightly generous radius (50px) for demo reliability
    if (!this.caught && this.fishY > 0) {
      const dist = Phaser.Math.Distance.Between(this.cat.x, this.cat.y, this.fishX, this.fishY)
      if (dist < 50) this.triggerCatch(this.fishX, this.fishY)
    }

    // Fish exits bottom without a catch — end demo
    if (!this.caught && this.fishY > H + 30) this.endDemo()

    // Trail follows laser container
    this.trail.forEach((t, i) => {
      t.x = this.laserX
      t.y = this.laserY
      t.alpha = 0.45 - i * 0.055
    })
  }
}

// ── DemoCanvas ────────────────────────────────────────────────────────────────

function DemoCanvas({ onComplete }) {
  const containerRef = useRef(null)

  useEffect(() => {
    activeCharacter = getStoredCharacter()
    onDemoCompleteCallback = onComplete

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: W, height: H,
      backgroundColor: '#0d0d2b',
      parent: containerRef.current,
      scene: DemoScene,
      audio: { noAudio: true },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    })

    return () => { onDemoCompleteCallback = null; game.destroy(true) }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        border: '2px solid #4ab0f0',
        boxShadow: '0 0 30px #4ab0f044, inset 0 0 30px #4ab0f011',
        borderRadius: '4px',
        overflow: 'hidden',
        width: '100%',
        maxWidth: `${W}px`,
        aspectRatio: `${W} / ${H}`,
        cursor: 'pointer',
        touchAction: 'none',
      }}
    />
  )
}

// ── LevelCanvas ───────────────────────────────────────────────────────────────

function LevelCanvas({ level, onComplete }) {
  const containerRef = useRef(null)

  useEffect(() => {
    activeCharacter = getStoredCharacter()
    activeLevel = level
    onLevelCompleteCallback = onComplete

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: W, height: H,
      backgroundColor: '#0d0d2b',
      parent: containerRef.current,
      scene: LevelScene,
      audio: { noAudio: true },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    })

    return () => { onLevelCompleteCallback = null; game.destroy(true) }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        border: '2px solid #22c55e',
        boxShadow: '0 0 30px #22c55e44, inset 0 0 30px #22c55e11',
        borderRadius: '4px',
        overflow: 'hidden',
        width: '100%',
        maxWidth: `${W}px`,
        aspectRatio: `${W} / ${H}`,
        touchAction: 'none',
      }}
    />
  )
}

// ── LevelSelect ───────────────────────────────────────────────────────────────

function LevelCard({ level, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const locked = level.locked

  return (
    <button
      onClick={() => !locked && onSelect(level)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={locked}
      style={{
        background: locked ? '#0a0a1a' : hovered ? `${level.color}18` : '#0a0a20',
        border: `2px solid ${locked ? '#1a1a35' : hovered ? level.color : '#2a2a55'}`,
        boxShadow: hovered && !locked ? `0 0 16px ${level.color}44` : 'none',
        borderRadius: '10px',
        padding: '20px 12px',
        cursor: locked ? 'default' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        flex: '1',
        minWidth: '90px',
        maxWidth: '130px',
        opacity: locked ? 0.4 : 1,
        transition: 'all 0.15s ease',
      }}
    >
      <span style={{ fontSize: '1.6rem' }}>{locked ? '🔒' : level.demo ? '▶' : '★'}</span>
      <span style={{
        fontFamily: "'Courier New', monospace", fontSize: '0.78rem',
        color: locked ? '#44446a' : level.color, letterSpacing: '1px',
      }}>
        {level.name}
      </span>
      <span style={{
        fontFamily: "'Courier New', monospace", fontSize: '0.58rem',
        color: '#44446a', letterSpacing: '0.5px', textAlign: 'center',
      }}>
        {locked ? 'Coming soon' : level.subtitle}
      </span>
    </button>
  )
}

function LevelSelect({ onSelect }) {
  return (
    <div style={{
      background: '#0d0d2b',
      border: '2px solid #4ab0f0',
      boxShadow: '0 0 30px #4ab0f044, inset 0 0 30px #4ab0f011',
      borderRadius: '4px',
      padding: '40px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '28px',
      aspectRatio: `${W} / ${H}`,
      justifyContent: 'center',
    }}>
      <p style={{
        fontFamily: "'Courier New', monospace", fontSize: '0.7rem',
        letterSpacing: '3px', color: '#4ab0f0', textTransform: 'uppercase',
      }}>
        Select Level
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
        {LEVELS.map(level => (
          <LevelCard key={level.id} level={level} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

// ── LevelComplete ─────────────────────────────────────────────────────────────

function LevelComplete({ level, stats, onRetry, onBack }) {
  return (
    <div style={{
      background: '#0d0d2b',
      border: `2px solid ${level.color}`,
      boxShadow: `0 0 30px ${level.color}44`,
      borderRadius: '4px',
      aspectRatio: `${W} / ${H}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      fontFamily: "'Courier New', monospace",
      color: '#ccccee',
    }}>
      <span style={{ fontSize: '4rem' }}>🎉</span>
      <p style={{ fontSize: '1.3rem', color: level.color, letterSpacing: '3px', margin: 0 }}>
        LEVEL COMPLETE!
      </p>
      <p style={{ fontSize: '0.75rem', color: '#8888bb', margin: 0, letterSpacing: '1px' }}>
        {level.name} — {level.subtitle}
      </p>
      {stats?.score > 0 && (
        <p style={{ fontSize: '1.1rem', color: '#ffdd00', margin: 0, letterSpacing: '2px' }}>
          SCORE: {stats.score}
        </p>
      )}
      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
        <ActionBtn color="#4ab0f0" onClick={onRetry}>↩ Retry</ActionBtn>
        <ActionBtn color="#9966cc" onClick={onBack}>★ All Levels</ActionBtn>
      </div>
    </div>
  )
}

function ActionBtn({ color, onClick, children }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? `${color}28` : `${color}18`,
        border: `2px solid ${color}`,
        boxShadow: hovered ? `0 0 16px ${color}44` : 'none',
        borderRadius: '6px',
        padding: '10px 28px',
        color: '#ffffff',
        fontSize: '0.85rem',
        fontFamily: "'Courier New', monospace",
        letterSpacing: '2px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {children}
    </button>
  )
}

// ── DemoComplete ──────────────────────────────────────────────────────────────

function DemoComplete({ onPlayAgain, onAllLevels }) {
  return (
    <div style={{
      aspectRatio: `${W} / ${H}`,
      background: '#0d0d2b',
      border: '2px solid #4ab0f0',
      boxShadow: '0 0 30px #4ab0f044, inset 0 0 30px #4ab0f011',
      borderRadius: '4px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '24px',
      fontFamily: "'Courier New', monospace",
    }}>
      <div style={{ display: 'flex', gap: '16px' }}>
        <ActionBtn color="#4ab0f0" onClick={onPlayAgain}>▶ Play Again</ActionBtn>
        <ActionBtn color="#9966cc" onClick={onAllLevels}>★ All Levels</ActionBtn>
      </div>
    </div>
  )
}

// ── AnimationSplash ───────────────────────────────────────────────────────────

function AnimationSplash({ onReady }) {
  useEffect(() => {
    const t = setTimeout(onReady, 2200)
    return () => clearTimeout(t)
  }, [onReady])

  return (
    <div
      onClick={onReady}
      style={{
        aspectRatio: `${W} / ${H}`,
        background: '#0d0d2b',
        border: '2px solid #4ab0f0',
        boxShadow: '0 0 30px #4ab0f044, inset 0 0 30px #4ab0f011',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        cursor: 'pointer',
        fontFamily: "'Courier New', monospace",
      }}
    >
      <p style={{ fontSize: '3.5rem', color: '#4ab0f0', letterSpacing: '6px', margin: 0 }}>
        Animation
      </p>
      <p style={{ fontSize: '0.85rem', color: '#8888bb', letterSpacing: '2px', margin: 0 }}>
        Watch the demonstration
      </p>
    </div>
  )
}

// ── PracticeSplash ────────────────────────────────────────────────────────────

function PracticeSplash({ onReady }) {
  useEffect(() => {
    const t = setTimeout(onReady, 2200)
    return () => clearTimeout(t)
  }, [onReady])

  return (
    <div
      onClick={onReady}
      style={{
        aspectRatio: `${W} / ${H}`,
        background: '#0d0d2b',
        border: '2px solid #22c55e',
        boxShadow: '0 0 30px #22c55e44, inset 0 0 30px #22c55e11',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        cursor: 'pointer',
        fontFamily: "'Courier New', monospace",
      }}
    >
      <p style={{ fontSize: '3.5rem', color: '#22c55e', letterSpacing: '6px', margin: 0 }}>
        Practice!
      </p>
      <p style={{ fontSize: '0.85rem', color: '#8888bb', letterSpacing: '2px', margin: 0 }}>
        Catch 3 fish to complete the tutorial
      </p>
    </div>
  )
}

// ── LevelGame (main export) ───────────────────────────────────────────────────

export default function LevelGame() {
  const [selectedLevel, setSelectedLevel] = useState(null)
  // phase: 'select' | 'animation-splash' | 'demo' | 'demo-complete' | 'practice-splash' | 'playing' | 'complete'
  const [phase, setPhase] = useState('select')
  const [gameKey, setGameKey] = useState(0)
  const [completionStats, setCompletionStats] = useState(null)

  function handleSelect(level) {
    setSelectedLevel(level)
    setGameKey(k => k + 1)
    if (level.demo)          setPhase('animation-splash')
    else if (level.tutorial) setPhase('practice-splash')
    else                     setPhase('playing')
  }

  function handleAnimationReady() { setPhase('demo') }
  function handleDemoComplete()   { setPhase('demo-complete') }
  function handleDemoPlayAgain()  { setPhase('demo'); setGameKey(k => k + 1) }

  function handlePracticeReady() {
    setPhase('playing')
    setGameKey(k => k + 1)
  }

  function handleComplete(stats) { setCompletionStats(stats); setPhase('complete') }

  function handleRetry() {
    setPhase(selectedLevel.tutorial ? 'practice-splash' : 'playing')
    setGameKey(k => k + 1)
  }

  function handleBack() {
    setSelectedLevel(null)
    setPhase('select')
  }

  return (
    <div style={{ width: '100%', maxWidth: `${W}px`, margin: '0 auto' }}>
      {phase === 'select'           && <LevelSelect onSelect={handleSelect} />}
      {phase === 'animation-splash' && <AnimationSplash onReady={handleAnimationReady} />}
      {phase === 'demo'             && <DemoCanvas key={gameKey} onComplete={handleDemoComplete} />}
      {phase === 'demo-complete'    && <DemoComplete onPlayAgain={handleDemoPlayAgain} onAllLevels={handleBack} />}
      {phase === 'practice-splash'  && <PracticeSplash onReady={handlePracticeReady} />}
      {phase === 'playing'          && <LevelCanvas key={gameKey} level={selectedLevel} onComplete={handleComplete} />}
      {phase === 'complete'         && <LevelComplete level={selectedLevel} stats={completionStats} onRetry={handleRetry} onBack={handleBack} />}
    </div>
  )
}
