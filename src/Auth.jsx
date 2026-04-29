import { useState } from 'react'
import { useAuth } from './AuthContext.jsx'

const dark = {
  background: 'transparent',
  fontFamily: "'Courier New', monospace",
  color: '#ccccee',
}

export default function Auth({ onSuccess }) {
  const { login } = useAuth()
  const [tab, setTab] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(tab === 'login' ? '/api/login' : '/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return }
      login(data.username)
      onSuccess?.(tab === 'login' ? 'levels' : 'profile')
    } catch {
      setError('Network error — try again.')
    } finally {
      setLoading(false)
    }
  }

  const accent = '#4ab0f0'

  return (
    <div style={{ ...dark, padding: '36px 32px', borderRadius: '4px', width: '100%', maxWidth: '360px', margin: '0 auto' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '28px', borderBottom: `1px solid #2a2a55` }}>
        {['login', 'register'].map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setError('') }}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? `2px solid ${accent}` : '2px solid transparent',
              color: tab === t ? accent : '#666688',
              padding: '8px 0 10px',
              fontSize: '0.75rem',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: "'Courier New', monospace",
              marginBottom: '-1px',
            }}
          >
            {t === 'login' ? 'Sign In' : 'Register'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '2px', color: '#8888bb', marginBottom: '6px' }}>
            USERNAME
          </label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '2px', color: '#8888bb', marginBottom: '6px' }}>
            PASSWORD
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            style={inputStyle}
          />
        </div>

        {error && (
          <p style={{ color: '#ff7777', fontSize: '0.72rem', margin: 0, letterSpacing: '0.5px' }}>
            ⚠ {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !username || !password}
          style={{
            marginTop: '4px',
            background: loading ? 'rgba(26, 26, 62, 0.5)' : 'rgba(74, 176, 240, 0.08)',
            border: `2px solid ${accent}`,
            boxShadow: loading ? 'none' : `0 0 14px ${accent}33`,
            borderRadius: '6px',
            padding: '10px 0',
            color: loading ? '#4ab0f088' : '#ffffff',
            fontSize: '0.85rem',
            fontFamily: "'Courier New', monospace",
            letterSpacing: '3px',
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? '…' : tab === 'login' ? '▶ SIGN IN' : '▶ CREATE ACCOUNT'}
        </button>
      </form>

      {tab === 'register' && (
        <p style={{ marginTop: '16px', fontSize: '0.65rem', color: '#8888bb', lineHeight: 1.6 }}>
          Username: 2–24 characters, letters/numbers/underscores only.<br />
          Password: 6 characters minimum.
        </p>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  background: 'rgba(10, 10, 32, 0.45)',
  border: '1px solid #2a2a55',
  borderRadius: '4px',
  padding: '9px 12px',
  color: '#ccccee',
  fontSize: '0.9rem',
  fontFamily: "'Courier New', monospace",
  outline: 'none',
  boxSizing: 'border-box',
}
