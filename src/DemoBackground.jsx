import { useEffect, useRef } from 'react'
import Phaser from 'phaser'

const W = 640
const H = 480

class BgDemoScene extends Phaser.Scene {
  constructor() { super('BgDemo') }

  preload() {
    this.makeCircleTexture('laser', 14, '#ff0000', '#ff6666')
    this.makeGlowTexture('glow', 40)
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

    this.laserX = W / 2
    this.laserY = 250
    this.fishX = Math.round(W * 2 / 3)

    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0d2b)
    this.add.rectangle(W / 2, H - 49, W, 98, 0x111130)

    const phases = [
      { label: 'WATCHING', desc: 'the cat spots the laser and waits for its moment', color: '#4ab0f0' },
      { label: 'STALKING', desc: 'creeping closer, circling for the right angle',     color: '#aaccff' },
      { label: 'POUNCING', desc: 'launching — and overshooting past the laser!',       color: '#ff9966' },
    ]
    this.phaseTexts = phases.map((p, i) =>
      this.add.text(20, H - 90 + i * 28, `${p.label}  —  ${p.desc}`, {
        fontSize: '16px', fontFamily: 'Courier New', color: p.color,
      }).setAlpha(0).setDepth(25)
    )
    this.phaseTexts[0].setAlpha(1)

    this.laserContainer = this.add.container(this.laserX, this.laserY).setDepth(5)
    this.laserContainer.add([
      this.add.image(0, 0, 'glow').setBlendMode('ADD'),
      this.add.image(0, 0, 'laser'),
    ])

    this.trail = Array.from({ length: 8 }, (_, i) =>
      this.add.circle(this.laserX, this.laserY, 4 - i * 0.4, 0xff0000, 0.45 - i * 0.055))

    this.fishY = -30
    this.fishSpeed = 0.62
    this.fishLabel = this.add.text(this.fishX, this.fishY, '🐟', { fontSize: '30px' })
      .setOrigin(0.5).setDepth(3)

    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: this.laserContainer,
        x: this.fishX,
        duration: 1200,
        ease: 'Sine.easeInOut',
      })
    })

    this.cat = this.add.container(80, 370).setDepth(4)
    this.cat.add(
      this.add.text(0, 0, '🐱', { fontSize: '36px' }).setOrigin(0.5)
    )

    this.catState = 'WATCHING'
    this.stateTimer = 1.5
    this.laserHistory = Array(90).fill({ x: this.laserX, y: this.laserY })
    this.stalkWaypoint = { x: 80, y: 370 }
    this.stalkMoving = true
    this.stalkMoveTimer = 0.8
    this.stalkPauseTimer = 0.4
    this.pounceOrigin = { x: 0, y: 0 }
    this.pounceTarget = { x: 0, y: 0 }
    this.pounceProgress = 0
    this.pounceArcDir = 1

    this.time.delayedCall(14000, () => this.endDemo())
  }

  showState(i) {
    if (!this.phaseTexts?.[i]) return
    this.tweens.add({ targets: this.phaseTexts[i], alpha: 1, duration: 400 })
  }

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
    this.laserHistory.push({ x: lx, y: ly })
    if (this.laserHistory.length > 90) this.laserHistory.shift()

    if (this.catState === 'WATCHING') {
      this.stateTimer -= dt
      this.cat.x += Math.sin(this.noiseTime * 3.7) * 5 * dt
      this.cat.y += Math.sin(this.noiseTime * 2.3 + 1.4) * 5 * dt
      this.cat.scaleX = lx < this.cat.x ? -1 : 1
      if (this.stateTimer <= 0) {
        this.catState = 'STALKING'
        this.stateTimer = 4.5
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
      if (this.stateTimer <= 0) {
        this.catState = 'POUNCING'
        const cached = this.laserHistory[Math.max(0, this.laserHistory.length - 30)]
        const dx = cached.x - this.cat.x
        const dy = cached.y - this.cat.y
        this.pounceOrigin = { x: this.cat.x, y: this.cat.y }
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
        this.stateTimer = 2.5
      }
    }

    this.cat.x = Phaser.Math.Clamp(this.cat.x, 20, W - 20)
    this.cat.y = Phaser.Math.Clamp(this.cat.y, 30, H - 60)
  }

  triggerCatch(x, y) {
    this.caught = true
    this.fishLabel.setVisible(false)
    const pop = this.add.text(x, y, '+10', {
      fontSize: '26px', fontFamily: 'Courier New',
      color: '#ffff00', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10)
    this.tweens.add({
      targets: pop, y: y - 70, alpha: 0, duration: 900, ease: 'Power2',
      onComplete: () => pop.destroy(),
    })
    this.tweens.add({ targets: this.cat, scaleY: 1.3, duration: 110, yoyo: true, repeat: 2 })
    this.time.delayedCall(3500, () => this.endDemo())
  }

  endDemo() {
    if (this.ended) return
    this.ended = true
    this.time.delayedCall(1200, () => this.scene.restart())
  }

  update(time, delta) {
    if (this.ended) return
    const dt = delta / 1000
    this.noiseTime += dt

    this.laserX = this.laserContainer.x
    this.laserY = this.laserContainer.y

    this.updateCat(dt)

    this.fishY += this.fishSpeed * dt * 60
    this.fishLabel.y = this.fishY

    if (!this.caught && this.fishY > 0) {
      const dist = Phaser.Math.Distance.Between(this.cat.x, this.cat.y, this.fishX, this.fishY)
      if (dist < 50) this.triggerCatch(this.fishX, this.fishY)
    }

    if (!this.caught && this.fishY > H + 30) this.endDemo()

    this.trail.forEach((t, i) => {
      t.x = this.laserX
      t.y = this.laserY
      t.alpha = 0.45 - i * 0.055
    })
  }
}

export default function DemoBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: W,
      height: H,
      backgroundColor: '#0d0d2b',
      parent: containerRef.current,
      scene: BgDemoScene,
      audio: { noAudio: true },
    })
    return () => game.destroy(true)
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', background: '#0d0d2b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div ref={containerRef} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(13, 13, 43, 0.68)' }} />
    </div>
  )
}
