import { useState } from 'react'
import Game from './Game.jsx'
import LevelGame from './LevelGame.jsx'
import Auth from './Auth.jsx'
import Profile from './Profile.jsx'
import Leaderboard from './Leaderboard.jsx'
import Guide from './Guide.jsx'
import { AuthProvider, useAuth } from './AuthContext.jsx'

function AppInner() {
  const { auth, logout } = useAuth()
  const [tab, setTab] = useState('levels')
  const [emailCopied, setEmailCopied] = useState(false)

  function copyEmail() {
    navigator.clipboard.writeText('jwgames@tutamail.com')
    setEmailCopied(true)
    setTimeout(() => setEmailCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Hero */}
      <header className="bg-slate-900 text-white py-12 px-6 text-center" style={{borderBottom: '2px solid #22c55e'}}>
        <div className="flex items-center justify-center gap-6">
          <div className="w-36 h-36 rounded-full overflow-hidden ring-2 ring-slate-600" style={{opacity: 0.7}}>
            <img src="/cat-orange.jpg" alt="Orange cat" className="w-full h-full object-cover" />
          </div>
          <h1 className="flex items-center justify-center gap-3 text-5xl md:text-7xl" style={{fontFamily: "'Fredoka', cursive", fontWeight: 400, letterSpacing: '0.15em', color: '#22c55e'}}>
            <span className="flex items-center gap-1">JW
              <svg width="16" height="36" viewBox="0 0 20 40" aria-hidden="true">
                <polygon points="10,0 20,20 10,40 0,20" fill="#cc0000" />
              </svg>
            </span>
            Games
          </h1>
          <div className="w-36 h-36 rounded-full overflow-hidden ring-2 ring-slate-600" style={{opacity: 0.7}}>
            <img src="/cat-black.jpg" alt="Black cat" className="w-full h-full object-cover" />
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-400" style={{fontFamily: "'Fredoka', cursive", letterSpacing: '0.08em'}}>
          A cat laser game with AI coaching and competitive leaderboards — built with React, Phaser 3 &amp; Cloudflare
        </p>
      </header>

      {/* Links bar */}
      <nav className="bg-slate-100 border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center justify-center gap-1 relative">
          <a
            href="https://www.linkedin.com/in/wilkes-jefferson/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors text-sm font-medium"
            style={{fontFamily: "'Fredoka', cursive", letterSpacing: '0.05em'}}
          >
            <LinkedInIcon />
            LinkedIn
          </a>
          <a
            href="https://github.com/jefferson-wilkes"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors text-sm font-medium"
            style={{fontFamily: "'Fredoka', cursive", letterSpacing: '0.05em'}}
          >
            <GitHubIcon />
            GitHub
          </a>
          <button
            onClick={copyEmail}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors text-sm font-medium cursor-pointer"
            style={{fontFamily: "'Fredoka', cursive", letterSpacing: '0.05em'}}
          >
            <EmailIcon />
            Email
          </button>
          {emailCopied && (
            <span className="absolute left-1/2 -translate-x-1/2 bottom-[-1.6rem] text-xs text-slate-400 whitespace-nowrap" style={{fontFamily: "'Fredoka', cursive"}}>
              Email copied to clipboard
            </span>
          )}
        </div>
      </nav>

      <main className="flex-1 w-full max-w-2xl mx-auto px-6 py-12">
        <section>
          <h2 className="text-xl font-medium tracking-widest uppercase mb-4 text-center" style={{fontFamily: "'Fredoka', cursive", color: '#cc0000', letterSpacing: '0.2em'}}>Laser Chase</h2>

          {!auth ? (
            /* Not logged in — show auth form inside game frame */
            <div style={{
              border: '2px solid #4ab0f0',
              boxShadow: '0 0 30px #4ab0f044, inset 0 0 30px #4ab0f011',
              borderRadius: '4px',
              background: '#0d0d2b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
            }}>
              <Auth />
            </div>
          ) : (
            <>
              {/* Tab bar */}
              <div style={{
                display: 'flex',
                gap: '0',
                borderBottom: '1px solid #e2e8f0',
                marginBottom: '20px',
              }}>
                {[
                  { id: 'levels',      label: '★ Levels'       },
                  { id: 'play',        label: '▶ Free Play'   },
                  { id: 'profile',     label: '👤 Profile'     },
                  { id: 'leaderboard', label: '◈ Leaderboard' },
                  { id: 'guide',       label: '📖 Guide'       },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      borderBottom: tab === t.id ? '2px solid #cc0000' : '2px solid transparent',
                      color: tab === t.id ? '#cc0000' : '#94a3b8',
                      padding: '8px 16px 10px',
                      fontSize: '0.8rem',
                      fontFamily: "'Fredoka', cursive",
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      marginBottom: '-1px',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
                <div style={{ flex: 1 }} />
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '4px 6px', gap: '2px',
                }}>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'Courier New', color: '#94a3b8' }}>
                    {auth.username}
                  </span>
                  <button
                    onClick={logout}
                    style={{
                      background: 'none', border: 'none',
                      color: '#94a3b8', fontSize: '0.58rem',
                      fontFamily: 'Courier New', cursor: 'pointer',
                      padding: '0', letterSpacing: '1px',
                    }}
                  >
                    sign out
                  </button>
                </div>
              </div>

              {tab === 'play'   && <Game />}
              {tab === 'levels' && <LevelGame />}
              {tab === 'profile' && (
                <div style={{
                  background: '#0d0d2b', border: '1px solid #2a2a55',
                  borderRadius: '4px', padding: '24px',
                }}>
                  <Profile />
                </div>
              )}
              {tab === 'leaderboard' && (
                <div style={{
                  background: '#0d0d2b', border: '1px solid #2a2a55',
                  borderRadius: '4px', padding: '24px',
                }}>
                  <Leaderboard />
                </div>
              )}
              {tab === 'guide' && (
                <div style={{
                  background: '#0d0d2b', border: '1px solid #2a2a55',
                  borderRadius: '4px', padding: '24px',
                }}>
                  <Guide />
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200 text-center text-xs text-slate-400 py-5" style={{fontFamily: "'Fredoka', cursive", letterSpacing: '0.08em'}}>
        &copy; {new Date().getFullYear()} Jefferson Wilkes &nbsp;·&nbsp; v2.4.0
      </footer>

    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}
