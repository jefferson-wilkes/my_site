import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Optimistic initial state: read username hint from localStorage (not sensitive).
  // Background /api/me call confirms or invalidates within ~200ms.
  const [auth, setAuth] = useState(() => {
    const username = localStorage.getItem('lc_username')
    return username ? { username } : null
  })

  useEffect(() => {
    fetch('/api/me')
      .then(r => {
        if (!r.ok) throw new Error('unauthorized')
        return r.json()
      })
      .then(data => {
        localStorage.setItem('lc_username', data.username)
        setAuth({ username: data.username })
      })
      .catch(() => {
        localStorage.removeItem('lc_username')
        setAuth(null)
      })
  }, [])

  const login = useCallback((username) => {
    localStorage.setItem('lc_username', username)
    setAuth({ username })
  }, [])

  const logout = useCallback(() => {
    fetch('/api/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('lc_username')
    setAuth(null)
  }, [])

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
