import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import CharacterSelect from './CharacterSelect.jsx'

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
    this.scoreTxt = this.add.text(10, 10, 'SCORE: 0', {
      fontSize: '18px', fontFamily: 'Courier New',
      color: '#ff4dff', stroke: '#000', strokeThickness: 3,
    }).setDepth(10)

    this.livesLeft = 5
    this.livesTxt = this.add.text(W - 10, 10, '❤️❤️❤️❤️❤️', {
      fontSize: '16px',
    }).setOrigin(1, 0).setDepth(10)

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

    this.items = this.add.group()
    this.itemLabels = []

    this.time.addEvent({
      delay: 1200,
      callback: this.spawnItem,
      callbackScope: this,
      loop: true,
    })

    this.cursors = this.input.keyboard.createCursorKeys()
    this.numpad = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.NUMPAD_EIGHT,
      down: Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO,
      left: Phaser.Input.Keyboard.KeyCodes.NUMPAD_FOUR,
      right: Phaser.Input.Keyboard.KeyCodes.NUMPAD_SIX,
      upleft: Phaser.Input.Keyboard.KeyCodes.NUMPAD_SEVEN,
      upright: Phaser.Input.Keyboard.KeyCodes.NUMPAD_NINE,
      downleft: Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE,
      downright: Phaser.Input.Keyboard.KeyCodes.NUMPAD_THREE,
    })

    this.laserSpeed = 5
    this.gameOver = false
  }

  spawnItem() {
    if (this.gameOver) return
    const item = ITEMS[Phaser.Math.Between(0, ITEMS.length - 1)]
    const x = Phaser.Math.Between(20, W - 20)

    const hitbox = this.add.rectangle(x, -20, 36, 36, 0xffffff, 0)
    hitbox.pts = item.pts
    hitbox.speed = Phaser.Math.FloatBetween(1.5, 3.5)
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

  update() {
    if (this.gameOver) return

    const speed = this.laserSpeed
    let dx = 0, dy = 0

    if (this.cursors.left.isDown || this.numpad.left.isDown || this.numpad.upleft.isDown || this.numpad.downleft.isDown) dx -= speed
    if (this.cursors.right.isDown || this.numpad.right.isDown || this.numpad.upright.isDown || this.numpad.downright.isDown) dx += speed
    if (this.cursors.up.isDown || this.numpad.up.isDown || this.numpad.upleft.isDown || this.numpad.upright.isDown) dy -= speed
    if (this.cursors.down.isDown || this.numpad.down.isDown || this.numpad.downleft.isDown || this.numpad.downright.isDown) dy += speed

    this.laser.x = Phaser.Math.Clamp(this.laser.x + dx, 10, W - 10)
    this.laser.y = Phaser.Math.Clamp(this.laser.y + dy, 10, H - 10)

    for (let i = this.trail.length - 1; i > 0; i--) {
      this.trail[i].x = this.trail[i - 1].x
      this.trail[i].y = this.trail[i - 1].y
    }
    this.trail[0].x = this.laser.x
    this.trail[0].y = this.laser.y

    const lx = this.laser.x, ly = this.laser.y
    const cx = this.cat.x, cy = this.cat.y
    const dist = Phaser.Math.Distance.Between(cx, cy, lx, ly)

    if (dist > 10) {
      const t = 0.06
      this.cat.x += (lx - cx) * t
      this.cat.y += (ly - cy) * t
      this.cat.scaleX = lx < cx ? -1 : 1
    }

    this.cat.y = Math.min(this.cat.y, H - 50)

    if (this.faceMaskGfx) {
      this.faceMaskGfx.setPosition(this.cat.x, this.cat.y)
    }

    const toRemove = []
    this.itemLabels.forEach((lbl, idx) => {
      const hb = lbl.hitbox
      if (!hb || !hb.active) { toRemove.push(idx); return }

      hb.y += hb.speed
      lbl.x = hb.x
      lbl.y = hb.y

      const catDist = Phaser.Math.Distance.Between(this.cat.x, this.cat.y, hb.x, hb.y)
      if (catDist < 35) {
        this.addScore(hb.pts, hb.x, hb.y)
        lbl.destroy()
        hb.destroy()
        toRemove.push(idx)
        return
      }

      if (hb.y > H + 30) {
        lbl.destroy()
        hb.destroy()
        toRemove.push(idx)
        this.livesLeft--
        this.livesTxt.setText('❤️'.repeat(Math.max(0, this.livesLeft)))
        if (this.livesLeft <= 0) this.endGame()
      }
    })

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.itemLabels.splice(toRemove[i], 1)
    }
  }

  endGame() {
    this.gameOver = true

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setDepth(20)

    this.add.text(W / 2, H / 2 - 60, 'GAME OVER', {
      fontSize: '48px', fontFamily: 'Courier New',
      color: '#ff4dff', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(21)

    this.add.text(W / 2, H / 2, 'SCORE: ' + this.score, {
      fontSize: '28px', fontFamily: 'Courier New',
      color: '#ffff00', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(21)

    const btn = this.add.text(W / 2, H / 2 + 70, '[ PLAY AGAIN ]', {
      fontSize: '22px', fontFamily: 'Courier New',
      color: '#ffffff', stroke: '#ff4dff', strokeThickness: 2,
      backgroundColor: '#ff4dff33', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(21).setInteractive({ useHandCursor: true })

    btn.on('pointerover', () => btn.setColor('#ff4dff'))
    btn.on('pointerout', () => btn.setColor('#ffffff'))
    btn.on('pointerdown', () => this.scene.restart())
  }
}

// ── GameCanvas ────────────────────────────────────────────────────────────────

function GameCanvas({ onChangeCharacter }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: W,
      height: H,
      backgroundColor: '#0d0d2b',
      parent: containerRef.current,
      scene: GameScene,
      audio: { noAudio: true },
    })
    return () => game.destroy(true)
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-400 font-mono tracking-wide">
          ARROW KEYS to move laser · Collect items!
        </p>
        <button
          onClick={onChangeCharacter}
          className="text-xs text-slate-400 hover:text-slate-600 font-mono underline underline-offset-2 cursor-pointer"
        >
          ↩ Change character
        </button>
      </div>
      <div className="overflow-x-auto">
        <div
          ref={containerRef}
          style={{
            border: '2px solid #ff4dff',
            boxShadow: '0 0 30px #ff4dff44, inset 0 0 30px #ff4dff11',
            borderRadius: '4px',
            overflow: 'hidden',
            display: 'inline-block',
          }}
        />
      </div>
    </div>
  )
}

// ── Game (main export) ────────────────────────────────────────────────────────

export default function Game() {
  const [character, setCharacter] = useState(null)

  function handleStart(char) {
    activeCharacter = char
    setCharacter(char)
  }

  function handleChangeCharacter() {
    activeCharacter = null
    setCharacter(null)
  }

  if (!character) {
    return <CharacterSelect onStart={handleStart} />
  }

  return <GameCanvas onChangeCharacter={handleChangeCharacter} />
}
