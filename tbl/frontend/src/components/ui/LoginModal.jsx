import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import Modal from './Modal'

export default function LoginModal({ onClose }) {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const { login } = useAuth()

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await login(usuario, password)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error en login! Usuario o contraseña incorrectos.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <Modal titulo="Acceder" onClose={onClose}>
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase text-text-muted">Usuario</span>
          <input
            type="text"
            name="usuario"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="h-12 rounded-xl border border-border bg-page px-3 text-base font-medium text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
            autoComplete="username"
            spellCheck={false}
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase text-text-muted">Contraseña</span>
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl border border-border bg-page px-3 text-base font-medium text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p role="alert" className="rounded-xl border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="mt-2 flex gap-3">
          <button
            type="submit"
            disabled={cargando}
            className="flex-1 rounded-xl bg-orange-600 px-4 py-3 font-bold text-white hover:bg-orange-500 active:scale-95 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-3 text-base font-semibold text-text-muted hover:text-text hover:border-orange-500/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}