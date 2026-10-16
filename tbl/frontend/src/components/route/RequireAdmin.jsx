import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { TOKEN_KEY } from '../../services/api'

export default function RequireAdmin({ children }) {
  const { user } = useAuth()
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
      : null

  if (!user || !token) return <Navigate to="/" replace />
  if (user.rol !== 'admin') return <Navigate to="/" replace />
  return children
}