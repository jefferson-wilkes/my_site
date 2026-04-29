import { useEffect, useState } from 'react'
import { useAuth } from './AuthContext.jsx'

function fmt(n, decimals = 0) {
  if (n == null) return '—'
  return Number(n).toFixed(decimals)
}

export default function Leaderboard() {
  const { auth } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(setData)
      .catch(() => setError('Could not load leaderboard.'))
  }, [])

  if (error) return <p style={{ color: '#ff7777', fontFamily: 'Courier New', textAlign: 'center' }}>{error}</p>
  if (!data) return <p style={{ color: '#8888bb', fontFamily: 'Courier New', textAlign: 'center' }}>Loading…</p>

  const entries = data.entries ?? []

  return (
    <div style={{ fontFamily: "'Courier New', monospace", color: '#ccccee' }}>
      <h3 style={{ fontSize: '0.7rem', letterSpacing: '3px', color: '#9966cc', textTransform: 'uppercase', marginBottom: '20px' }}>
        Leaderboard <span style={{ color: '#8888bb', letterSpacing: '1px' }}>(Free Play)</span>
      </h3>

      {entries.length === 0 ? (
        <p style={{ color: '#aaaacc', fontSize: '0.8rem', textAlign: 'center' }}>No players yet — be the first!</p>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
              <thead>
                <tr style={{ color: '#8888bb', borderBottom: '1px solid #2a2a55' }}>
                  <th style={th}>#</th>
                  <th style={th}>Player</th>
                  <th style={th}>Best</th>
                  <th style={th}>Avg Score</th>
                  <th style={th}>Games</th>
                  <th style={th}>Catch%</th>
                  <th style={th}>Speed</th>
                  <th style={th}>Freq</th>
                  <th style={th}>Smooth</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => {
                  const isMe = e.username === auth?.username
                  return (
                    <tr
                      key={e.username}
                      style={{
                        borderBottom: '1px solid #1a1a35',
                        color: i === 0 ? '#ffdd00' : isMe ? '#4ab0f0' : '#ccccee',
                        background: isMe ? '#4ab0f008' : 'transparent',
                      }}
                    >
                      <td style={td}>{i === 0 ? '★' : i + 1}</td>
                      <td style={{ ...td, fontWeight: isMe ? 'bold' : 'normal' }}>
                        {e.username}{isMe ? ' (you)' : ''}
                      </td>
                      <td style={{ ...td, fontWeight: 'bold' }}>{e.best_score}</td>
                      <td style={td}>{fmt(e.avg_score)}</td>
                      <td style={td}>{e.games_played}</td>
                      <td style={td}>{fmt(e.catch_rate * 100, 0)}%</td>
                      <td style={td}>{fmt(e.avg_speed)}</td>
                      <td style={td}>{fmt(e.movement_frequency * 100, 0)}%</td>
                      <td style={td}>{fmt(e.movement_smoothness, 1)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {entries.length >= 2 && <WhatWorks entries={entries} />}
        </>
      )}

      <div style={{ marginTop: '12px', fontSize: '0.6rem', color: '#aaaacc', lineHeight: 1.8 }}>
        <strong style={{ color: '#ccccee' }}>Key:</strong>{' '}
        Speed = avg px/s · Freq = % of frames laser moved · Smooth = jitter stddev (lower = smoother)
      </div>
    </div>
  )
}

function WhatWorks({ entries }) {
  const half = Math.ceil(entries.length / 2)
  const top = entries.slice(0, half)
  const bot = entries.slice(half)

  function avgOf(arr, key) {
    return arr.reduce((a, e) => a + (e[key] ?? 0), 0) / arr.length
  }

  const stats = [
    {
      label: 'Laser speed (px/s)',
      topVal: fmt(avgOf(top, 'avg_speed')),
      botVal: fmt(avgOf(bot, 'avg_speed')),
      note: 'Speed of laser movement.',
    },
    {
      label: 'Movement frequency',
      topVal: fmt(avgOf(top, 'movement_frequency') * 100, 0) + '%',
      botVal: fmt(avgOf(bot, 'movement_frequency') * 100, 0) + '%',
      note: 'How often the laser was moving.',
    },
    {
      label: 'Smoothness (jitter)',
      topVal: fmt(avgOf(top, 'movement_smoothness'), 1),
      botVal: fmt(avgOf(bot, 'movement_smoothness'), 1),
      note: 'Lower = smoother movements.',
    },
  ]

  return (
    <div style={{ marginTop: '24px', background: '#0a0a20', border: '1px solid #2a2a55', borderRadius: '6px', padding: '16px' }}>
      <div style={{ fontSize: '0.65rem', letterSpacing: '2px', color: '#9966cc', marginBottom: '12px' }}>
        WHAT SEPARATES TOP vs. BOTTOM HALF
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
        <thead>
          <tr style={{ color: '#8888bb', borderBottom: '1px solid #2a2a55' }}>
            <th style={th}>Metric</th>
            <th style={{ ...th, color: '#ffdd00' }}>Top half</th>
            <th style={{ ...th, color: '#8888bb' }}>Bottom half</th>
            <th style={th}>Note</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(s => (
            <tr key={s.label} style={{ borderBottom: '1px solid #1a1a35' }}>
              <td style={td}>{s.label}</td>
              <td style={{ ...td, color: '#ffdd00' }}>{s.topVal}</td>
              <td style={{ ...td, color: '#8888bb' }}>{s.botVal}</td>
              <td style={{ ...td, color: '#aaaacc', fontSize: '0.62rem' }}>{s.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const th = { padding: '6px 10px', textAlign: 'left', letterSpacing: '1px', fontSize: '0.62rem', fontWeight: 'normal' }
const td = { padding: '6px 10px' }
