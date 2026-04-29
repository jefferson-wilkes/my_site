const accent = {
  blue:   '#4ab0f0',
  purple: '#9966cc',
  green:  '#22c55e',
  yellow: '#ffdd00',
  orange: '#f59e0b',
}

function Section({ color = accent.blue, emoji, title, children }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h4 style={{
        fontFamily: "'Courier New', monospace",
        fontSize: '0.72rem',
        letterSpacing: '3px',
        textTransform: 'uppercase',
        color,
        borderBottom: `1px solid ${color}44`,
        paddingBottom: '8px',
        marginBottom: '14px',
      }}>
        {emoji && <span style={{ marginRight: '8px' }}>{emoji}</span>}
        {title}
      </h4>
      <div style={{
        fontFamily: "'Courier New', monospace",
        fontSize: '0.82rem',
        color: '#ccccee',
        lineHeight: 1.8,
      }}>
        {children}
      </div>
    </div>
  )
}

function Step({ n, children }) {
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
      <span style={{
        fontFamily: "'Courier New', monospace",
        fontSize: '0.7rem',
        color: accent.blue,
        minWidth: '20px',
        paddingTop: '1px',
      }}>{n}.</span>
      <span>{children}</span>
    </div>
  )
}

function Tag({ color = accent.blue, children }) {
  return (
    <span style={{
      background: `${color}22`,
      border: `1px solid ${color}66`,
      borderRadius: '3px',
      padding: '1px 6px',
      fontSize: '0.75rem',
      color,
      fontFamily: "'Courier New', monospace",
    }}>
      {children}
    </span>
  )
}

export default function Guide() {
  return (
    <div>
      <h3 style={{
        fontFamily: "'Courier New', monospace",
        fontSize: '0.7rem',
        letterSpacing: '3px',
        color: accent.blue,
        textTransform: 'uppercase',
        marginBottom: '28px',
      }}>
        Guide
      </h3>

      {/* ── Profile Setup ─────────────────────────────────────────────────────── */}
      <Section emoji="👤" title="Setting Up Your Profile" color={accent.blue}>
        <p style={{ marginBottom: '12px' }}>
          All features — levels, free play stats, and the leaderboard — require an account.
          No email address is needed.
        </p>
        <Step n={1}>Click <Tag>Sign In</Tag> on the main screen and switch to the <Tag>Register</Tag> tab.</Step>
        <Step n={2}>Choose a username (2–24 characters, letters/numbers/underscores) and a password of at least 6 characters.</Step>
        <Step n={3}>Once logged in, open the <Tag color={accent.purple}>👤 Profile</Tag> tab to pick your character — choose from eight cat emojis or upload your own photo. Your character appears in every game as the cat chasing the laser.</Step>
        <Step n={4}>Your character is saved to your account on this device. If you log in on a different browser you can set it again from the Profile tab.</Step>
      </Section>

      {/* ── Game Mechanics ────────────────────────────────────────────────────── */}
      <Section emoji="🎮" title="How the Game Works" color={accent.green}>
        <p style={{ marginBottom: '12px' }}>
          The core mechanic is the same across every mode: you control a red laser dot with your mouse or finger, and your cat follows it.
        </p>
        <p style={{ marginBottom: '12px' }}>
          The cat moves through three natural states:
        </p>
        <div style={{ marginBottom: '12px', paddingLeft: '12px', borderLeft: `2px solid ${accent.green}44` }}>
          <div style={{ marginBottom: '6px' }}><Tag color={accent.blue}>WATCHING</Tag> — The cat notices the laser and waits, making small idle movements.</div>
          <div style={{ marginBottom: '6px' }}><Tag color={accent.orange}>STALKING</Tag> — It creeps toward the laser in a circling, indirect approach.</div>
          <div><Tag color='#ff9966'>POUNCING</Tag> — It launches at the laser's last known position — and slightly overshoots, just like a real cat.</div>
        </div>
        <p>
          Items (or birds) are only caught when the cat is within range of them — not the laser. Your job is to position the laser so the cat intercepts the target.
        </p>
      </Section>

      {/* ── Levels ────────────────────────────────────────────────────────────── */}
      <Section emoji="★" title="Navigating the Levels" color={accent.orange}>
        <p style={{ marginBottom: '12px' }}>
          Open the <Tag color={accent.orange}>★ Levels</Tag> tab to see the level select screen. Levels unlock in order; start with the Demo.
        </p>
        <div style={{ marginBottom: '10px', paddingLeft: '12px', borderLeft: `2px solid ${accent.orange}44` }}>
          <div style={{ marginBottom: '8px' }}>
            <Tag color={accent.blue}>▶ Demo</Tag> — A 10-second animated walkthrough showing the cat's Watching, Stalking, and Pouncing behavior. Watch it before playing for the first time. You can replay it any time.
          </div>
          <div style={{ marginBottom: '8px' }}>
            <Tag color={accent.green}>★ Tutorial</Tag> — A slow-paced practice round. One fish falls at a time; catch 3 to complete it. Coaching text appears as you play to explain what's happening.
          </div>
          <div style={{ marginBottom: '8px' }}>
            <Tag color={accent.orange}>Level 1: Schools</Tag> — 30 seconds. Fish fall in coordinated formations (rows of 3–4, or split groups on opposite sides of the screen). Score as many points as possible before time runs out.
          </div>
          <div>
            <Tag color={accent.green}>Level 2: Bird Chase</Tag> — 30 seconds. Five birds (parrot, blackbird, hawk, duck, and a sparrow) fly independently between branches in a backyard. Catch all five before time runs out.
          </div>
        </div>
        <p>
          Each level shows your personal best on the opening splash screen and again at the end alongside your current run. Use <Tag>Next Level ▶</Tag> on the end screen to continue without returning to the level select.
        </p>
      </Section>

      {/* ── Free Play ─────────────────────────────────────────────────────────── */}
      <Section emoji="▶" title="Free Play" color={accent.purple}>
        <p style={{ marginBottom: '12px' }}>
          Free Play is an open-ended 60-second game with no structure — just score as high as you can.
          Items fall continuously from the top of the screen in random positions at varying speeds, each worth different points:
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {[
            ['🐟', '10 pts'], ['🍖', '10 pts'], ['🖱️', '15 pts'],
            ['🧶', '20 pts'], ['🐭', '25 pts'], ['🦋', '30 pts'], ['⭐', '50 pts'],
          ].map(([emoji, pts]) => (
            <span key={emoji} style={{ fontFamily: 'Courier New', fontSize: '0.75rem', color: '#ccccee' }}>
              {emoji} {pts}
            </span>
          ))}
        </div>
        <p>
          Your all-time high score is tracked in your browser and shown on the play screen before each game. Free play performance is also recorded to your account for leaderboard comparison.
        </p>
      </Section>

      {/* ── Coaching ──────────────────────────────────────────────────────────── */}
      <Section emoji="💡" title="AI Coaching" color={accent.yellow}>
        <p style={{ marginBottom: '12px' }}>
          After each free play game, a <Tag color={accent.yellow}>💡 How did I do?</Tag> link appears below the canvas.
        </p>
        <p style={{ marginBottom: '12px' }}>
          Clicking it sends your game stats to an AI coach (Claude, by Anthropic), which analyzes how you played and offers 2–3 sentences of personalized advice. The coach considers:
        </p>
        <div style={{ paddingLeft: '12px', borderLeft: `2px solid ${accent.yellow}44`, marginBottom: '12px' }}>
          <div>— Where on the screen you kept the laser (height affects how quickly the cat can intercept items)</div>
          <div>— How fast and how smoothly you moved the laser</div>
          <div>— How often you kept the laser moving vs. holding it still</div>
        </div>
        <p>
          Once enough players have played, the coach will compare your stats to higher-scoring players and phrase the advice conversationally — e.g., <em style={{ color: '#aaaacc' }}>"other top players tend to keep the laser a bit higher on screen."</em>
        </p>
      </Section>

      {/* ── Leaderboard ───────────────────────────────────────────────────────── */}
      <Section emoji="◈" title="Leaderboard & Comparing Performance" color={accent.purple}>
        <p style={{ marginBottom: '12px' }}>
          The <Tag color={accent.purple}>◈ Leaderboard</Tag> tab shows free play rankings across all players. Your row is highlighted in blue.
        </p>
        <p style={{ marginBottom: '12px' }}>
          Beyond raw score, the leaderboard tracks three movement metrics collected during each game:
        </p>
        <div style={{ paddingLeft: '12px', borderLeft: `2px solid ${accent.purple}44`, marginBottom: '12px' }}>
          <div style={{ marginBottom: '4px' }}><Tag color={accent.purple}>Speed</Tag> — Average laser speed in pixels per second.</div>
          <div style={{ marginBottom: '4px' }}><Tag color={accent.purple}>Freq</Tag> — Percentage of time the laser was actually moving (vs. held still).</div>
          <div><Tag color={accent.purple}>Smooth</Tag> — Jitter in laser movement (lower = smoother, more deliberate).</div>
        </div>
        <p>
          Once at least two players have played, a <strong style={{ color: '#ccccee' }}>What Separates Top vs. Bottom Half</strong> table appears below the rankings, showing which movement patterns correlate with higher scores. This updates automatically as more games are played.
        </p>
      </Section>
    </div>
  )
}
