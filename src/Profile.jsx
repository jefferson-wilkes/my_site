import { useEffect, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import CharacterPicker from './CharacterSelect.jsx'

function characterKey() {
  const u = localStorage.getItem('lc_username')
  return u ? `lc_character_${u}` : 'lc_character'
}
function getStoredCharacter() {
  try {
    const key = characterKey()
    const stored = localStorage.getItem(key)
    if (!stored && key !== 'lc_character') {
      const old = localStorage.getItem('lc_character')
      if (old) { localStorage.setItem(key, old); return JSON.parse(old) }
    }
    return JSON.parse(stored) ?? { type: 'emoji', value: '🐱' }
  } catch {
    return { type: 'emoji', value: '🐱' }
  }
}

const W = 640

function fmt(n, decimals = 0) {
  if (n == null) return '—'
  return Number(n).toFixed(decimals)
}

function StatBox({ label, value, sub }) {
  return (
    <div style={{
      background: '#0a0a20', border: '1px solid #2a2a55', borderRadius: '6px',
      padding: '12px 16px', flex: '1', minWidth: '120px',
    }}>
      <div style={{ fontSize: '0.6rem', letterSpacing: '2px', color: '#8888bb', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '1.3rem', color: '#4ab0f0', fontFamily: "'Courier New', monospace", fontWeight: 'bold' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.6rem', color: '#44446a', marginTop: '2px' }}>{sub}</div>}
    </div>
  )
}

export default function Profile() {
  const { auth } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [character, setCharacter] = useState(getStoredCharacter)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/me', { headers: { Authorization: `Bearer ${auth.token}` } })
      .then(r => r.json())
      .then(setData)
      .catch(() => setError('Could not load profile.'))
  }, [auth.token])

  function handleCharacterChange(char) {
    setCharacter(char)
    localStorage.setItem(characterKey(), JSON.stringify(char))
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  if (error) return <p style={{ color: '#ff7777', fontFamily: 'Courier New', textAlign: 'center' }}>{error}</p>
  if (!data) return <p style={{ color: '#8888bb', fontFamily: 'Courier New', textAlign: 'center' }}>Loading…</p>

  const sessions = data.sessions ?? []
  const best = sessions.length ? Math.max(...sessions.map(s => s.score)) : 0
  const avgScore = sessions.length ? Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length) : 0

  return (
    <div style={{ fontFamily: "'Courier New', monospace", color: '#ccccee' }}>
      <h3 style={{ fontSize: '0.7rem', letterSpacing: '3px', color: '#4ab0f0', textTransform: 'uppercase', marginBottom: '20px' }}>
        {data.username}'s Profile
      </h3>

      {/* Character picker */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '0.6rem', letterSpacing: '2px', color: '#8888bb', marginBottom: '10px' }}>YOUR CHARACTER</div>
        <CharacterPicker value={character} onChange={handleCharacterChange} />
        {saved && (
          <p style={{ marginTop: '8px', fontSize: '0.65rem', color: '#22c55e', letterSpacing: '1px' }}>✓ Saved</p>
        )}
      </div>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <StatBox label="BEST SCORE" value={best} />
        <StatBox label="AVG SCORE" value={avgScore} />
        <StatBox label="GAMES PLAYED" value={sessions.length} />

      </div>

      {/* Session history */}
      <div style={{ fontSize: '0.6rem', letterSpacing: '2px', color: '#8888bb', marginBottom: '10px' }}>
        FREE PLAY HISTORY
      </div>
      {sessions.length === 0 ? (
        <p style={{ color: '#aaaacc', fontSize: '0.8rem', textAlign: 'center' }}>No games yet — play one!</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
            <thead>
              <tr style={{ color: '#8888bb', borderBottom: '1px solid #2a2a55' }}>
                <th style={th}>Date</th>
                <th style={th}>Score</th>
                <th style={th}>Caught</th>
                <th style={th}>Missed</th>
                <th style={th}>Speed</th>
                <th style={th}>Freq</th>
                <th style={th}>Smooth</th>
                <th style={th}>Still</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1a1a35', color: i === 0 ? '#4ab0f0' : '#ccccee' }}>
                  <td style={td}>{new Date(s.played_at * 1000).toLocaleDateString()}</td>
                  <td style={{ ...td, fontWeight: 'bold' }}>{s.score}</td>
                  <td style={td}>{s.caught}</td>
                  <td style={td}>{s.missed}</td>
                  <td style={td}>{fmt(s.avg_speed)}</td>
                  <td style={td}>{fmt(s.movement_frequency * 100, 0)}%</td>
                  <td style={td}>{fmt(s.movement_smoothness, 1)}</td>
                  <td style={td}>{fmt(s.time_stationary, 1)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '12px', fontSize: '0.6rem', color: '#aaaacc', lineHeight: 1.8 }}>
        <strong style={{ color: '#ccccee' }}>Key:</strong>{' '}
        Speed = avg px/s · Freq = % of frames laser was moving · Smooth = jitter (lower = smoother) · Still = seconds not moving
      </div>
    </div>
  )
}

const th = { padding: '6px 10px', textAlign: 'left', letterSpacing: '1px', fontSize: '0.62rem', fontWeight: 'normal' }
const td = { padding: '6px 10px' }
