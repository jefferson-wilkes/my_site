import { useState } from 'react'
import Game from './Game.jsx'

function App() {
  const [emailCopied, setEmailCopied] = useState(false)

  function copyEmail() {
    navigator.clipboard.writeText('jwilkes@mba2027.hbs.edu')
    setEmailCopied(true)
    setTimeout(() => setEmailCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Hero */}
      <header className="bg-slate-900 text-white py-12 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-wide mb-6" style={{fontFamily: "'Playfair Display', serif"}}>A Clash of Claws</h1>
        <div className="flex items-center justify-center gap-6">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-slate-600">
            <img src="/cat-orange.jpg" alt="Orange cat" className="w-full h-full object-cover" />
          </div>
          <img src="/claws.png" alt="Crossed claws" className="w-16 h-16" />
          <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-slate-600">
            <img src="/cat-black.jpg" alt="Black cat" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      {/* Links bar */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center gap-1 relative">
          <a
            href="https://www.linkedin.com/in/wilkes-jefferson/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-sm font-medium"
          >
            <LinkedInIcon />
            LinkedIn
          </a>
          <a
            href="https://github.com/jefferson-wilkes"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-sm font-medium"
          >
            <GitHubIcon />
            GitHub
          </a>
          <button
            onClick={copyEmail}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-sm font-medium cursor-pointer"
          >
            <EmailIcon />
            Email
          </button>
          {emailCopied && (
            <span className="absolute left-1/2 -translate-x-1/2 bottom-[-1.6rem] text-xs text-slate-500 whitespace-nowrap">
              Email copied to clipboard
            </span>
          )}
        </div>
      </nav>

      <main className="flex-1 w-full max-w-2xl mx-auto px-6 py-12">

        {/* Game */}
        <section>
          <h2 className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-4">Laser Chase</h2>
          <Game />
        </section>

      </main>

      <footer className="border-t border-slate-200 text-center text-xs text-slate-400 py-5 tracking-wide">
        &copy; {new Date().getFullYear()} Jefferson Wilkes &nbsp;·&nbsp; v1.5.3
      </footer>

    </div>
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

export default App
