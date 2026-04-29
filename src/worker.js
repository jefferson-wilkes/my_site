// ── Crypto helpers ────────────────────────────────────────────────────────────

const enc = new TextEncoder()

async function hashPassword(password) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
    key, 256
  )
  return b64(salt) + '.' + b64(new Uint8Array(bits))
}

async function verifyPassword(password, stored) {
  const [saltB64, hashB64] = stored.split('.')
  const salt = unb64(saltB64)
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
    key, 256
  )
  return b64(new Uint8Array(bits)) === hashB64
}

async function signJWT(payload, secret) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${body}`))
  return `${header}.${body}.${b64(new Uint8Array(sig))}`
}

async function verifyJWT(token, secret) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('bad token')
  const [header, body, sig] = parts
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  )
  const ok = await crypto.subtle.verify('HMAC', key, unb64(sig), enc.encode(`${header}.${body}`))
  if (!ok) throw new Error('invalid signature')
  const payload = JSON.parse(atob(body))
  if (payload.exp && payload.exp < Date.now() / 1000) throw new Error('expired')
  return payload
}

function b64(buf) {
  return btoa(String.fromCharCode(...buf))
}
function unb64(s) {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0))
}
function uuid() {
  return crypto.randomUUID()
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}
function err(msg, status = 400) {
  return json({ error: msg }, status)
}

async function getUser(request, env) {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  try {
    return await verifyJWT(token, env.JWT_SECRET)
  } catch {
    return null
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    // ── POST /api/register ────────────────────────────────────────────────────
    if (path === '/api/register' && method === 'POST') {
      const { username, password } = await request.json()
      if (!username || !password) return err('username and password required')
      if (username.length < 2 || username.length > 24) return err('username must be 2–24 characters')
      if (!/^[a-zA-Z0-9_]+$/.test(username)) return err('username may only contain letters, numbers, and underscores')
      if (password.length < 6) return err('password must be at least 6 characters')

      const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
      if (existing) return err('username already taken', 409)

      const id = uuid()
      const password_hash = await hashPassword(password)
      await env.DB.prepare(
        'INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)'
      ).bind(id, username, password_hash, Math.floor(Date.now() / 1000)).run()

      const token = await signJWT({ sub: id, username, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, env.JWT_SECRET)
      return json({ token, username })
    }

    // ── POST /api/login ───────────────────────────────────────────────────────
    if (path === '/api/login' && method === 'POST') {
      const { username, password } = await request.json()
      if (!username || !password) return err('username and password required')

      const user = await env.DB.prepare('SELECT id, password_hash FROM users WHERE username = ?').bind(username).first()
      if (!user) return err('invalid username or password', 401)

      const ok = await verifyPassword(password, user.password_hash)
      if (!ok) return err('invalid username or password', 401)

      const token = await signJWT({ sub: user.id, username, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, env.JWT_SECRET)
      return json({ token, username })
    }

    // ── POST /api/game-session ────────────────────────────────────────────────
    if (path === '/api/game-session' && method === 'POST') {
      const user = await getUser(request, env)
      if (!user) return err('unauthorized', 401)

      const body = await request.json()
      const { score, caught, missed, pounces, avgLaserY, avgSpeed, totalLaserDist,
              movementFrequency, movementSmoothness, timeStationary } = body

      await env.DB.prepare(`
        INSERT INTO game_sessions
          (id, user_id, score, caught, missed, pounces,
           avg_laser_y, avg_speed, total_laser_dist,
           movement_frequency, movement_smoothness, time_stationary,
           played_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        uuid(), user.sub, score, caught, missed, pounces,
        avgLaserY, avgSpeed, totalLaserDist,
        movementFrequency, movementSmoothness, timeStationary,
        Math.floor(Date.now() / 1000)
      ).run()

      return json({ ok: true })
    }

    // ── GET /api/me ───────────────────────────────────────────────────────────
    if (path === '/api/me' && method === 'GET') {
      const user = await getUser(request, env)
      if (!user) return err('unauthorized', 401)

      const sessions = await env.DB.prepare(`
        SELECT score, caught, missed, pounces,
               avg_laser_y, avg_speed, total_laser_dist,
               movement_frequency, movement_smoothness, time_stationary,
               played_at
        FROM game_sessions
        WHERE user_id = ?
        ORDER BY played_at DESC
        LIMIT 50
      `).bind(user.sub).all()

      return json({ username: user.username, sessions: sessions.results })
    }

    // ── GET /api/leaderboard ──────────────────────────────────────────────────
    if (path === '/api/leaderboard' && method === 'GET') {
      // Best score per user
      const top = await env.DB.prepare(`
        SELECT u.username, MAX(g.score) as best_score,
               COUNT(*) as games_played,
               ROUND(AVG(g.score), 0) as avg_score,
               ROUND(AVG(g.avg_laser_y), 1) as avg_laser_y,
               ROUND(AVG(g.avg_speed), 1) as avg_speed,
               ROUND(AVG(g.movement_frequency), 3) as movement_frequency,
               ROUND(AVG(g.movement_smoothness), 1) as movement_smoothness,
               ROUND(AVG(g.time_stationary), 1) as time_stationary,
               ROUND(AVG(g.caught * 1.0 / (g.caught + g.missed + 0.001)), 3) as catch_rate
        FROM game_sessions g
        JOIN users u ON u.id = g.user_id
        GROUP BY g.user_id
        ORDER BY best_score DESC
        LIMIT 50
      `).all()

      return json({ entries: top.results })
    }

    // ── POST /api/admin/reset-password ────────────────────────────────────────
    if (path === '/api/admin/reset-password' && method === 'POST') {
      const { adminSecret, username, newPassword } = await request.json()
      if (adminSecret !== env.ADMIN_SECRET) return err('forbidden', 403)
      if (!username || !newPassword) return err('username and newPassword required')
      if (newPassword.length < 6) return err('password must be at least 6 characters')

      const user = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
      if (!user) return err('user not found', 404)

      const password_hash = await hashPassword(newPassword)
      await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        .bind(password_hash, user.id).run()

      return json({ ok: true })
    }

    // ── POST /api/cat-response ────────────────────────────────────────────────
    if (path === '/api/cat-response' && method === 'POST') {
      const { score, caught, missed, pounces, avgLaserY, avgSpeed,
              movementFrequency, movementSmoothness } = await request.json()

      // Pull averages from above-median sessions so comparisons are data-driven
      let topAvg = null
      try {
        const count = await env.DB.prepare('SELECT COUNT(*) as n FROM game_sessions').first()
        if (count.n >= 3) {
          topAvg = await env.DB.prepare(`
            SELECT AVG(avg_laser_y)         as laser_y,
                   AVG(avg_speed)           as speed,
                   AVG(movement_frequency)  as freq,
                   AVG(movement_smoothness) as smoothness
            FROM game_sessions
            WHERE score >= (SELECT AVG(score) FROM game_sessions)
          `).first()
        }
      } catch {}

      // Build natural-language comparison hints for each dimension where
      // the player meaningfully differs from above-average players.
      // Claude decides which to mention and how to phrase them — we just
      // supply the directional facts and keep raw numbers out of the output.
      const comparisons = []
      if (topAvg) {
        const laserDiff = avgLaserY - topAvg.laser_y
        if (Math.abs(laserDiff) > 30) {
          comparisons.push(laserDiff > 0
            ? 'Higher-scoring players tend to keep the laser a bit higher on screen (further from the bottom edge).'
            : 'Higher-scoring players tend to keep the laser a bit lower on screen (closer to where items land).'
          )
        }

        const speedDiff = avgSpeed - topAvg.speed
        if (Math.abs(speedDiff) > 30) {
          comparisons.push(speedDiff < 0
            ? 'Higher-scoring players tend to move the laser a bit more actively between item spawns.'
            : 'Higher-scoring players tend to use slower, more deliberate movements rather than fast sweeps.'
          )
        }

        if (movementFrequency != null) {
          const freqDiff = movementFrequency - topAvg.freq
          if (Math.abs(freqDiff) > 0.1) {
            comparisons.push(freqDiff < 0
              ? 'Higher-scoring players keep the laser moving more consistently rather than leaving it still.'
              : 'Higher-scoring players are more selective about when they move — they hold position more often.'
            )
          }
        }

        if (movementSmoothness != null) {
          const smoothDiff = movementSmoothness - topAvg.smoothness
          if (Math.abs(smoothDiff) > 3) {
            comparisons.push(smoothDiff > 0
              ? 'Higher-scoring players tend to move the laser more smoothly, with fewer sudden direction changes.'
              : 'Higher-scoring players use more dynamic, varied movements.'
            )
          }
        }
      }

      const comparisonBlock = comparisons.length
        ? `\nHow this player compares to higher-scoring players:\n${comparisons.map(c => `- ${c}`).join('\n')}`
        : ''

      const prompt = `A player just finished a 60-second game of Laser Chase. Here is how the game works:

- Items (fish, yarn, etc.) fall from the top of the screen toward the bottom
- The player moves a laser dot to guide a cat to intercept the falling items
- The cat always chases the laser — it watches, stalks, then pounces toward wherever the laser is
- The screen is 480px tall; Y=0 is the top, Y=480 is the bottom

Player stats this game:
- Final score: ${score}
- Items caught: ${caught}, items missed: ${missed}
- Cat pounces: ${pounces}
- Average laser Y position: ${avgLaserY} (out of 480; lower = higher on screen)
- Average laser speed: ${avgSpeed} px/s
- Fraction of time laser was moving: ${movementFrequency != null ? Math.round(movementFrequency * 100) + '%' : 'unknown'}
- Movement smoothness (jitter, lower = smoother): ${movementSmoothness ?? 'unknown'}
${comparisonBlock}

Give 2-3 sentences of encouraging, specific coaching. Use the comparison data if present — phrase it conversationally (e.g. "other players tend to hold it a bit higher" not "your Y was 310 vs 240"). Use a cat pun or two naturally, don't force it. Focus on what to do more of.`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        console.error('Anthropic error', response.status, data)
        return json({ error: `Anthropic API error ${response.status}: ${data.error?.message ?? 'unknown'}` }, 502)
      }
      const text = data.content?.[0]?.text ?? 'No advice available.'
      return new Response(JSON.stringify({ text }), { headers: { 'Content-Type': 'application/json' } })
    }

    return env.ASSETS.fetch(request)
  },
}
