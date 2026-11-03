import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Modal from './Modal'
import { IconEye, IconEyeOff, IconLock } from './Icon'

const LOCKOUT_KEY = 'tbl_login_lockout_until'

function getLockoutRestante() {
  if (typeof window === 'undefined') return 0
  const raw = localStorage.getItem(LOCKOUT_KEY) || sessionStorage.getItem(LOCKOUT_KEY)
  if (!raw) return 0
  const timestamp = parseInt(raw, 10)
  if (isNaN(timestamp)) return 0
  const diffMs = timestamp - Date.now()
  if (diffMs <= 0) {
    localStorage.removeItem(LOCKOUT_KEY)
    sessionStorage.removeItem(LOCKOUT_KEY)
    return 0
  }
  return Math.ceil(diffMs / 1000)
}

function setLockoutPersistente(segundos) {
  if (typeof window === 'undefined') return
  const hasta = Date.now() + segundos * 1000
  localStorage.setItem(LOCKOUT_KEY, String(hasta))
  sessionStorage.setItem(LOCKOUT_KEY, String(hasta))
}

function clearLockoutPersistente() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(LOCKOUT_KEY)
  sessionStorage.removeItem(LOCKOUT_KEY)
}

export default function LoginModal({ onClose }) {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [segundosBloqueo, setSegundosBloqueo] = useState(() => getLockoutRestante())
  const [error, setError] = useState(() => {
    const restantes = getLockoutRestante()
    if (restantes > 0) {
      return {
        titulo: 'Acceso bloqueado',
        mensaje: `Demasiados intentos. Esperá para volver a intentar.`,
      }
    }
    return null
  })
  const [cargando, setCargando] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  // Cuenta regresiva en vivo persistente
  useEffect(() => {
    if (segundosBloqueo <= 0) return

    const timer = setInterval(() => {
      const restantes = getLockoutRestante()
      if (restantes <= 0) {
        clearInterval(timer)
        clearLockoutPersistente()
        setSegundosBloqueo(0)
        setError(null)
      } else {
        setSegundosBloqueo(restantes)
        setError({
          titulo: 'Acceso bloqueado',
          mensaje: `Demasiados intentos. Esperá para volver a intentar.`,
        })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [segundosBloqueo > 0]) // taste-skill-ignore

  const enviar = async (e) => {
    e.preventDefault()
    if (segundosBloqueo > 0) return
    setError(null)

    const u = usuario.trim()
    if (!u && !password) {
      setError({
        titulo: 'Campos requeridos',
        mensaje: 'Ingresá tu usuario y contraseña para continuar.',
      })
      return
    }
    if (!u) {
      setError({
        titulo: 'Usuario requerido',
        mensaje: 'Por favor completá tu nombre de usuario.',
      })
      return
    }
    if (!password) {
      setError({
        titulo: 'Contraseña requerida',
        mensaje: 'Por favor ingresá tu contraseña de acceso.',
      })
      return
    }

    setCargando(true)
    try {
      const perfil = await login(u, password)
      clearLockoutPersistente()
      onClose()
      if (perfil?.rol === 'admin') {
        navigate('/admin')
      }
    } catch (err) {
      const status = err.response?.status
      const detail = err.response?.data?.detail

      if (status === 401) {
        setError({
          titulo: 'Credenciales incorrectas',
          mensaje: 'El usuario o la contraseña no coinciden.',
        })
      } else if (status === 429) {
        let segs = 60
        if (typeof detail === 'string') {
          const match = detail.match(/(\d+)\s+segundos/i)
          if (match && match[1]) {
            segs = parseInt(match[1], 10)
          }
        }
        setLockoutPersistente(segs)
        setSegundosBloqueo(segs)
        setError({
          titulo: 'Acceso bloqueado',
          mensaje: `Demasiados intentos. Esperá para volver a intentar.`,
        })
      } else if (status === 403) {
        setError({
          titulo: 'Usuario inactivo',
          mensaje:
            typeof detail === 'string'
              ? detail
              : 'Tu cuenta de usuario se encuentra desactivada. Comunicate con la administración del torneo.',
        })
      } else if (!err.response) {
        setError({
          titulo: 'Problema de conexión',
          mensaje: 'No se pudo conectar con el servidor. Comprobá tu conexión a internet o intentá más tarde.',
        })
      } else {
        setError({
          titulo: 'No se pudo iniciar sesión',
          mensaje: typeof detail === 'string' ? detail : 'Ocurrió un error inesperado al procesar la solicitud.',
        })
      }
    } finally {
      setCargando(false)
    }
  }

  const estaBloqueado = segundosBloqueo > 0

  return (
    <Modal titulo="Mesa de Control · Acceso" onClose={onClose}>
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        {/* Campo Usuario */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-usuario" className="text-xs font-semibold uppercase text-text-muted">
            Usuario
          </label>
          <input
            id="login-usuario"
            type="text"
            name="usuario"
            disabled={cargando}
            value={usuario}
            onChange={(e) => {
              setUsuario(e.target.value)
              if (error && !estaBloqueado) setError(null)
            }}
            placeholder="Nombre de usuario"
            className="h-12 rounded-xl border border-border bg-page px-3.5 text-base font-medium text-text placeholder:text-text-muted/40 outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            autoComplete="username"
            spellCheck={false}
            autoFocus
          />
        </div>

        {/* Campo Contraseña con botón mostrar/ocultar */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-password" className="text-xs font-semibold uppercase text-text-muted">
            Contraseña
          </label>
          <div className="relative flex items-center">
            <input
              id="login-password"
              type={mostrarPassword ? 'text' : 'password'}
              name="password"
              disabled={cargando}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error && !estaBloqueado) setError(null)
              }}
              placeholder="Contraseña de acceso"
              className="h-12 w-full rounded-xl border border-border bg-page pl-3.5 pr-11 text-base font-medium text-text placeholder:text-text-muted/40 outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setMostrarPassword((prev) => !prev)}
              className="absolute right-2 grid h-8 w-8 place-items-center rounded-lg text-text-muted hover:text-text hover:bg-surface active:scale-95 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              title={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              tabIndex={-1}
            >
              {mostrarPassword ? (
                <IconEyeOff className="w-5 h-5" />
              ) : (
                <IconEye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mensaje de Error Amigable */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 animate-in fade-in zoom-in-95 duration-150"
          >
            <svg
              className="w-4 h-4 shrink-0 mt-0.5 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="flex-1 leading-relaxed">
              <span className="font-bold block text-[13px]">{error.titulo}</span>
              <span className="text-text-muted dark:text-red-300">{error.mensaje}</span>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="mt-2 flex gap-3">
          <button
            type="submit"
            disabled={cargando || estaBloqueado}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${estaBloqueado
              ? 'bg-neutral-600/50 cursor-not-allowed text-neutral-300 border border-neutral-600/40'
              : 'bg-orange-600 hover:bg-orange-500 active:scale-95 disabled:opacity-50'
              }`}
          >
            {estaBloqueado ? (
              <span className="tabular-nums font-bold">{segundosBloqueo}s</span>
            ) : cargando ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>Ingresando…</span>
              </>
            ) : (
              <span>Ingresar</span>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-3 text-base font-semibold text-text-muted hover:text-text hover:border-orange-500/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            Cancelar
          </button>
        </div>

        {/* Garantía de Seguridad / Pie */}
        <div className="pt-1 flex items-center justify-center gap-1.5 text-xs text-text-muted">
          <IconLock className="w-3.5 h-3.5 text-orange-500" />
          <span>Acceso protegido</span>
        </div>
      </form>
    </Modal>
  )
}
