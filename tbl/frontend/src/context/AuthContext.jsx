import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api, { TOKEN_KEY, USER_KEY } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  })
  const [loginModalAbierto, setLoginModalAbierto] = useState(false)

  const abrirLogin = useCallback(() => setLoginModalAbierto(true), [])
  const cerrarLogin = useCallback(() => setLoginModalAbierto(false), [])

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null)
    }
    window.addEventListener('auth:expired', handleAuthExpired)
    return () => window.removeEventListener('auth:expired', handleAuthExpired)
  }, [])

  const login = useCallback(async (usuario, password) => {
    const res = await api.post('/auth/login', { usuario, password })
    const { access_token, rol } = res.data
    const perfil = { usuario, rol }
    localStorage.setItem(TOKEN_KEY, access_token)
    localStorage.setItem(USER_KEY, JSON.stringify(perfil))
    setUser(perfil)
    return perfil
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  const setUsuario = useCallback((next) => {
    setUser(next)
    localStorage.setItem(USER_KEY, JSON.stringify(next))
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        setUsuario,
        loginModalAbierto,
        abrirLogin,
        cerrarLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}