import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { TOKEN_KEY } from '../../services/api'

export default function RequireAdmin({ children }) {
  const { user, abrirLogin } = useAuth()
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
      : null

  if (!user || !token) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
        <div data-ui="auth-card" className="max-w-md w-full rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <span className="font-display text-sm font-semibold text-orange-500">
            Mesa de Control & Oficiales
          </span>
          <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight text-text">
            Acceso Restringido
          </h2>
          <p className="mt-2 text-sm text-text-muted leading-relaxed">
            Esta sección es exclusiva para la administración y mesa de control oficial de la LBA.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={abrirLogin}
              className="w-full rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-500 active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              Iniciar Sesión
            </button>
            <Link
              to="/"
              className="text-xs font-semibold text-text-muted hover:text-text transition-colors py-1"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (user.rol !== 'admin') return <Navigate to="/" replace />
  return children
}