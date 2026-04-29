import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { useAuth } from './AuthContext.jsx'

function getStoredCharacter() {
  try {
    return JSON.parse(localStorage.getItem('lc_character')) ?? { type: 'emoji', value: '🐱' }
  } catch {
    return { type: 'emoji', value: '🐱' }
  }
}

const W = 640, H = 480

const ITEMS = [
  { emoji: '🐟', pts: 10 },
  { emoji: '🧶', pts: 20 },
  { emoji: '🖱️', pts: 15 },
  { emoji: '🐭', pts: 25 },
  { emoji: '🦋', pts: 30 },
  { emoji: '🍖', pts: 10 },
  { emoji: '⭐', pts: 50 },
]

// Bridge between React state and the Phaser scene (set before game is created)
let activeCharacter = null
let onGameEndCallback = null

class GameScene extends Phaser.Scene {
  constructor() { super('Game') }

  preload() {
    this.makeCircleTexture('laser', 14, '#ff0000', '#ff6666')
    this.makeCircleTexture('cat_body', 22, '#f5c842', '#e8b830')
    this.makeCircleTexture('item', 20, '#ffffff', '#eeeeee')
    this.makeGlowTexture('glow', 40)
    if (activeCharacter?.type === 'image') {
      this.load.image('char', activeCharacter.src)
    }
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
      const alpha = (1 - i / r) * 0.3
      g.fillStyle(0xff0000, alpha)
      g.fillCircle(r, r, i)
    }
    g.generateTexture(key, r * 2, r * 2)
    g.destroy()
  }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0d2b)
    this.add.rectangle(W / 2, H - 10, W, 20, 0x1a1a3e)

    this.score = 0
    this.highScore = parseInt(localStorage.getItem('laserChaseHighScore') ?? '0', 10)

    this.caught = 0
    this.missed = 0
    this.pounces = 0
    this.laserYSum = 0
    this.laserFrames = 0
    this.totalLaserDist = 0
    this.prevLaserX = W / 2
    this.prevLaserY = H / 2

    // New instrumentation
    this.movingFrames = 0        // frames where laser moved > 1px
    this.stationaryTime = 0      // seconds laser didn't move
    this.dispSum = 0             // sum of per-frame displacement (for smoothness stddev)
    this.dispSumSq = 0           // sum of squares
    this.prevDisp = 0

    this.scoreTxt = this.add.text(10, 10, 'SCORE: 0', {
      fontSize: '18px', fontFamily: 'Courier New',
      color: '#4ab0f0', stroke: '#000', strokeThickness: 3,
    }).setDepth(10)

    this.highScoreTxt = this.add.text(W - 10, 10, 'BEST: ' + this.highScore, {
      fontSize: '18px', fontFamily: 'Courier New',
      color: '#9966cc', stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(10)

    this.timeLeft = 60
    this.timerTxt = this.add.text(W / 2, 10, '60', {
      fontSize: '18px', fontFamily: 'Courier New',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(10)

    this.laser = this.add.container(W / 2, H / 2)
    const glow = this.add.image(0, 0, 'glow').setBlendMode('ADD')
    const dot = this.add.image(0, 0, 'laser')
    this.laser.add([glow, dot])
    this.laser.setDepth(5)

    this.trail = []
    for (let i = 0; i < 8; i++) {
      const t = this.add.circle(0, 0, 4 - i * 0.4, 0xff0000, 0.5 - i * 0.06)
      this.trail.push(t)
    }

    this.cat = this.add.container(100, H - 60)
    this.faceMaskGfx = null

    if (activeCharacter?.type === 'image') {
      // Scale the image to cover a 52px circle, then mask it
      const faceSize = 52
      const src = this.textures.get('char').getSourceImage()
      const imgScale = faceSize / Math.min(src.width, src.height)
      const faceImg = this.add.image(0, 0, 'char').setScale(imgScale)

      this.faceMaskGfx = this.make.graphics()
      this.faceMaskGfx.fillStyle(0xffffff)
      this.faceMaskGfx.fillCircle(0, 0, faceSize / 2)
      faceImg.setMask(this.faceMaskGfx.createGeometryMask())
      this.cat.add(faceImg)
    } else {
      // Emoji character
      const emoji = activeCharacter?.value ?? '🐱'
      const body = this.add.text(0, 0, emoji, { fontSize: '36px' }).setOrigin(0.5)
      this.cat.add(body)
    }

    this.cat.setDepth(4)

    // AI state machine
    this.catState = 'WATCHING'
    this.stateTimer = Phaser.Math.FloatBetween(0.8, 1.8)
    this.noiseTime = 0
    this.laserHistory = []
    this.stalkWaypoint = { x: this.cat.x, y: this.cat.y }
    this.stalkMoving = true
    this.stalkMoveTimer = 0
    this.stalkPauseTimer = 0
    this.pounceOrigin = { x: 0, y: 0 }
    this.pounceTarget = { x: 0, y: 0 }
    this.pounceProgress = 0
    this.pounceArcDir = 1

    this.items = this.add.group()
    this.itemLabels = []

    this.time.addEvent({
      delay: 1200,
      callback: this.spawnItem,
      callbackScope: this,
      loop: true,
    })

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

    this.gameOver = false
  }

  spawnItem() {
    if (this.gameOver) return
    const item = ITEMS[Phaser.Math.Between(0, ITEMS.length - 1)]
    const x = Phaser.Math.Between(20, W - 20)

    const hitbox = this.add.rectangle(x, -20, 36, 36, 0xffffff, 0)
    hitbox.pts = item.pts
    hitbox.speed = Phaser.Math.FloatBetween(0.8, 1.9)
    this.items.add(hitbox)

    const lbl = this.add.text(x, -20, item.emoji, { fontSize: '30px' }).setOrigin(0.5)
    lbl.hitbox = hitbox
    this.itemLabels.push(lbl)
  }

  addScore(pts, x, y) {
    this.score += pts
    this.scoreTxt.setText('SCORE: ' + this.score)

    const pop = this.add.text(x, y, '+' + pts, {
      fontSize: '20px', fontFamily: 'Courier New',
      color: '#ffff00', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10)
    this.tweens.add({
      targets: pop, y: y - 60, alpha: 0, duration: 800,
      ease: 'Power2', onComplete: () => pop.destroy(),
    })
  }

  update(time, delta) {
    if (this.gameOver) return


    this.timeLeft -= delta / 1000
    const secsLeft = Math.ceil(Math.max(0, this.timeLeft))
    this.timerTxt.setText(secsLeft)
    this.timerTxt.setColor(secsLeft <= 10 ? '#ff4444' : '#ffffff')
    if (this.timeLeft <= 0) { this.endGame(); return }

    const ldx = this.laser.x - this.prevLaserX
    const ldy = this.laser.y - this.prevLaserY
    const disp = Math.sqrt(ldx * ldx + ldy * ldy)
    this.totalLaserDist += disp
    this.prevLaserX = this.laser.x
    this.prevLaserY = this.laser.y
    this.laserYSum += this.laser.y
    this.laserFrames++

    // Instrumentation
    if (disp > 1) {
      this.movingFrames++
    } else {
      this.stationaryTime += delta / 1000
    }
    this.dispSum += disp
    this.dispSumSq += disp * disp

    for (let i = this.trail.length - 1; i > 0; i--) {
      this.trail[i].x = this.trail[i - 1].x
      this.trail[i].y = this.trail[i - 1].y
    }
    this.trail[0].x = this.laser.x
    this.trail[0].y = this.laser.y

    this.updateCat(delta)

    const toRemove = []
    this.itemLabels.forEach((lbl, idx) => {
      const hb = lbl.hitbox
      if (!hb || !hb.active) { toRemove.push(idx); return }

      hb.y += hb.speed * (delta / 1000) * 60
      lbl.x = hb.x
      lbl.y = hb.y

      const catDist = Phaser.Math.Distance.Between(this.cat.x, this.cat.y, hb.x, hb.y)
      if (catDist < 35) {
        this.addScore(hb.pts, hb.x, hb.y)
        this.caught++
        lbl.destroy()
        hb.destroy()
        toRemove.push(idx)
        return
      }

      if (hb.y > H + 30) {
        this.missed++
        lbl.destroy()
        hb.destroy()
        toRemove.push(idx)
        // no lives — timer is the only end condition
      }
    })

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.itemLabels.splice(toRemove[i], 1)
    }
  }

  updateCat(delta) {
    const dt = delta / 1000
    const lx = this.laser.x, ly = this.laser.y

    // Rolling 1.5s history of laser positions (used for committed pounce target)
    this.laserHistory.push({ x: lx, y: ly })
    if (this.laserHistory.length > 90) this.laserHistory.shift()

    this.noiseTime += dt

    if (this.catState === 'WATCHING') {
      this.stateTimer -= dt
      // Fidget in place — subtle sine-wave jitter so it looks alive
      this.cat.x += Math.sin(this.noiseTime * 3.7) * 5 * dt
      this.cat.y += Math.sin(this.noiseTime * 2.3 + 1.4) * 5 * dt
      // Track laser with gaze (just the flip)
      this.cat.scaleX = lx < this.cat.x ? -1 : 1
      if (this.stateTimer <= 0) this._enterStalking(lx, ly)

    } else if (this.catState === 'STALKING') {
      this.stateTimer -= dt

      if (this.stalkMoving) {
        this.stalkMoveTimer -= dt
        const dx = this.stalkWaypoint.x - this.cat.x
        const dy = this.stalkWaypoint.y - this.cat.y
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d > 6) {
          const speed = 58 // px/s — deliberate creep
          this.cat.x += (dx / d) * speed * dt
          this.cat.y += (dy / d) * speed * dt
          this.cat.scaleX = dx < 0 ? -1 : 1
        }
        if (this.stalkMoveTimer <= 0 || d < 6) {
          // Freeze — then pick a new offset waypoint
          this.stalkMoving = false
          this.stalkPauseTimer = Phaser.Math.FloatBetween(0.2, 0.7)
          this._updateStalkWaypoint(lx, ly)
        }
      } else {
        this.stalkPauseTimer -= dt
        if (this.stalkPauseTimer <= 0) {
          this.stalkMoving = true
          this.stalkMoveTimer = Phaser.Math.FloatBetween(0.5, 1.5)
        }
      }

      const distToLaser = Phaser.Math.Distance.Between(this.cat.x, this.cat.y, lx, ly)
      if (distToLaser < 180 || this.stateTimer <= 0) this._enterPouncing()

    } else if (this.catState === 'POUNCING') {
      this.pounceProgress = Math.min(1, this.pounceProgress + 3.2 * dt)

      // Ease-out: fast launch, decelerates on landing
      const ease = 1 - Math.pow(1 - this.pounceProgress, 2)
      const baseX = this.pounceOrigin.x + (this.pounceTarget.x - this.pounceOrigin.x) * ease
      const baseY = this.pounceOrigin.y + (this.pounceTarget.y - this.pounceOrigin.y) * ease

      // Arc perpendicular to the pounce direction
      const pdx = this.pounceTarget.x - this.pounceOrigin.x
      const pdy = this.pounceTarget.y - this.pounceOrigin.y
      const plen = Math.sqrt(pdx * pdx + pdy * pdy)
      if (plen > 1) {
        const arcAmt = Math.sin(this.pounceProgress * Math.PI) * Math.min(plen * 0.18, 45) * this.pounceArcDir
        this.cat.x = baseX + (-pdy / plen) * arcAmt
        this.cat.y = baseY + (pdx / plen) * arcAmt
      } else {
        this.cat.x = baseX
        this.cat.y = baseY
      }

      if (this.pounceProgress >= 1) {
        this.catState = 'WATCHING'
        this.stateTimer = Phaser.Math.FloatBetween(1, 2.5)
      }
    }

    this.cat.x = Phaser.Math.Clamp(this.cat.x, 20, W - 20)
    this.cat.y = Phaser.Math.Clamp(this.cat.y, 30, H - 50)

    if (this.faceMaskGfx) {
      this.faceMaskGfx.setPosition(this.cat.x, this.cat.y)
    }
  }

  _enterStalking(lx, ly) {
    this.catState = 'STALKING'
    this.stateTimer = Phaser.Math.FloatBetween(2, 4.5)
    this.stalkMoving = true
    this.stalkMoveTimer = Phaser.Math.FloatBetween(0.5, 1.2)
    this._updateStalkWaypoint(lx, ly)
  }

  _updateStalkWaypoint(lx, ly) {
    // Aim for a point laterally offset from the laser rather than straight at it —
    // this produces the circling, indirect approach cats use before striking.
    const angle = Math.atan2(ly - this.cat.y, lx - this.cat.x)
    const side = Math.random() > 0.5 ? 1 : -1
    const deviation = Phaser.Math.FloatBetween(0.4, 1.1) // 23–63° off the direct line
    const approachAngle = angle + side * deviation
    const dist = Phaser.Math.FloatBetween(80, 160)
    this.stalkWaypoint = {
      x: Phaser.Math.Clamp(lx + Math.cos(approachAngle) * dist, 40, W - 40),
      y: Phaser.Math.Clamp(ly + Math.sin(approachAngle) * dist, 40, H - 60),
    }
  }

  _enterPouncing() {
    this.catState = 'POUNCING'
    this.pounces++
    // Commit to where the laser WAS ~0.5s ago — cats don't track mid-pounce
    const cached = this.laserHistory[Math.max(0, this.laserHistory.length - 30)]
    const dx = cached.x - this.cat.x
    const dy = cached.y - this.cat.y
    this.pounceOrigin = { x: this.cat.x, y: this.cat.y }
    // Overshoot by 25% — the classic cat-skids-past-the-target moment
    this.pounceTarget = {
      x: Phaser.Math.Clamp(this.cat.x + dx * 1.25, 20, W - 20),
      y: Phaser.Math.Clamp(this.cat.y + dy * 1.25, 20, H - 50),
    }
    this.pounceProgress = 0
    this.pounceArcDir = Math.random() > 0.5 ? 1 : -1
    this.cat.scaleX = dx < 0 ? -1 : 1
  }

  endGame() {
    this.gameOver = true

    if (onGameEndCallback) {
      const n = this.laserFrames
      const mean = n > 0 ? this.dispSum / n : 0
      const variance = n > 1 ? (this.dispSumSq / n - mean * mean) : 0
      const smoothness = Math.round(Math.sqrt(Math.max(0, variance)) * 10) / 10

      onGameEndCallback({
        score: this.score,
        caught: this.caught,
        missed: this.missed,
        pounces: this.pounces,
        avgLaserY: n > 0 ? Math.round(this.laserYSum / n) : H / 2,
        avgSpeed: n > 0 ? Math.round((this.totalLaserDist / n) * 60) : 0,
        totalLaserDist: Math.round(this.totalLaserDist),
        movementFrequency: n > 0 ? Math.round((this.movingFrames / n) * 1000) / 1000 : 0,
        movementSmoothness: smoothness,
        timeStationary: Math.round(this.stationaryTime * 10) / 10,
      })
    }

    const isNewHigh = this.score > this.highScore
    if (isNewHigh) {
      this.highScore = this.score
      localStorage.setItem('laserChaseHighScore', String(this.score))
    }

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setDepth(20)

    this.add.text(W / 2, H / 2 - 70, 'GAME OVER', {
      fontSize: '48px', fontFamily: 'Courier New',
      color: '#4ab0f0', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(21)

    this.add.text(W / 2, H / 2 - 15, 'SCORE: ' + this.score, {
      fontSize: '28px', fontFamily: 'Courier New',
      color: '#ffff00', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(21)

    if (isNewHigh) {
      this.add.text(W / 2, H / 2 + 22, '★ NEW HIGH SCORE ★', {
        fontSize: '16px', fontFamily: 'Courier New',
        color: '#ffdd00', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(21)
    } else {
      this.add.text(W / 2, H / 2 + 22, 'BEST: ' + this.highScore, {
        fontSize: '16px', fontFamily: 'Courier New',
        color: '#9966cc', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(21)
    }

    const btn = this.add.text(W / 2, H / 2 + 70, '[ PLAY AGAIN ]', {
      fontSize: '22px', fontFamily: 'Courier New',
      color: '#ffffff', stroke: '#4ab0f0', strokeThickness: 2,
      backgroundColor: '#4ab0f033', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(21).setInteractive({ useHandCursor: true })

    btn.on('pointerover', () => btn.setColor('#4ab0f0'))
    btn.on('pointerout', () => btn.setColor('#ffffff'))
    btn.on('pointerdown', () => this.scene.restart())
  }
}

// ── GameCanvas ────────────────────────────────────────────────────────────────

function GameCanvas({ character, onGameEnd, token }) {
  const containerRef = useRef(null)

  useEffect(() => {
    activeCharacter = character
    onGameEndCallback = async (stats) => {
      onGameEnd(stats)
      if (token) {
        fetch('/api/game-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(stats),
        }).catch(() => {})
      }
    }
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: W,
      height: H,
      backgroundColor: '#0d0d2b',
      parent: containerRef.current,
      scene: GameScene,
      audio: { noAudio: true },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    })
    return () => { onGameEndCallback = null; game.destroy(true) }
  }, [])

  return (
    <div>
      <p className="text-xs text-slate-400 font-mono tracking-wide mb-3">
        Touch or drag to move laser · Collect items!
      </p>
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
    </div>
  )
}

// ── HowDidIDo ─────────────────────────────────────────────────────────────────

function HowDidIDo({ stats }) {
  const [open, setOpen] = useState(false)
  const [advice, setAdvice] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/cat-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stats),
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setAdvice(data.text)
      })
      .catch(() => setError('Could not reach the advice endpoint.'))
  }, [])

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-slate-400 hover:text-slate-600 font-mono underline underline-offset-2 cursor-pointer"
      >
        {open ? '↑ Hide' : '💡 How did I do?'}
      </button>
      {open && (
        <p className="mt-2 text-sm text-slate-600 font-mono leading-relaxed">
          {error ?? advice ?? 'Analyzing your game…'}
        </p>
      )}
    </div>
  )
}

// ── PlaySplash ────────────────────────────────────────────────────────────────

function PlaySplash({ character, onPlay, bestScore }) {
  return (
    <div style={{
      aspectRatio: `${W} / ${H}`,
      border: '2px solid #22c55e',
      boxShadow: '0 0 30px #22c55e44, inset 0 0 30px #22c55e11',
      borderRadius: '4px',
      background: '#0d0d2b',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '24px',
    }}>
      {character?.type === 'image' ? (
        <img
          src={character.src}
          alt="Your character"
          style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #22c55e', boxShadow: '0 0 20px #22c55e44' }}
        />
      ) : (
        <span style={{ fontSize: '5rem', lineHeight: 1 }}>{character?.value ?? '🐱'}</span>
      )}

      <button
        onClick={onPlay}
        style={{
          background: '#22c55e18',
          border: '2px solid #22c55e',
          boxShadow: '0 0 24px #22c55e44',
          borderRadius: '8px',
          padding: '14px 60px',
          color: '#ffffff',
          fontSize: '1.1rem',
          fontFamily: "'Courier New', monospace",
          letterSpacing: '4px',
          cursor: 'pointer',
        }}
      >
        ▶ PLAY
      </button>

      {bestScore > 0 && (
        <p style={{ fontFamily: "'Courier New', monospace", fontSize: '0.75rem', color: '#9966cc', letterSpacing: '2px' }}>
          BEST: {bestScore}
        </p>
      )}
    </div>
  )
}

// ── Game (main export) ────────────────────────────────────────────────────────

export default function Game() {
  const { auth } = useAuth()
  const [playing, setPlaying] = useState(false)
  const [gameStats, setGameStats] = useState(null)
  const [gameCount, setGameCount] = useState(0)
  const character = getStoredCharacter()
  const bestScore = parseInt(localStorage.getItem('laserChaseHighScore') ?? '0', 10)

  function handleGameEnd(stats) {
    setGameStats(stats)
    setGameCount(c => c + 1)
  }

  return (
    <div style={{ width: '100%', maxWidth: `${W}px`, margin: '0 auto' }}>
      {playing
        ? <>
            <GameCanvas character={character} onGameEnd={handleGameEnd} token={auth?.token} />
            {gameStats && <HowDidIDo key={gameCount} stats={gameStats} />}
          </>
        : <PlaySplash character={character} onPlay={() => { setGameStats(null); setPlaying(true) }} bestScore={bestScore} />
      }
    </div>
  )
}
