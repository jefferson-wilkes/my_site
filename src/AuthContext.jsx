import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('lc_token')
    const username = localStorage.getItem('lc_username')
    return token && username ? { token, username } : null
  })

  const login = useCallback((token, username) => {
    localStorage.setItem('lc_token', token)
    localStorage.setItem('lc_username', username)
    setAuth({ token, username })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('lc_token')
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
