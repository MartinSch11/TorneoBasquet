import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import api from '../../services/api'
import { IconClose } from '../ui/Icon'
import useBodyLock from '../../hooks/useBodyLock'

export default function ModalCrearUsuario({
  isOpen,
  onClose,
  onUsuarioCreado,
}) {
  useBodyLock(isOpen)
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('visitante')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setUsuario('')
      setPassword('')
      setRol('visitante')
      setError('')
      setGuardando(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !guardando) {
        onClose?.()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, guardando, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const userLimpio = usuario.trim()
    if (userLimpio.length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres')
      return
    }

    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres')
      return
    }

    try {
      setGuardando(true)
      const res = await api.post('/auth/usuarios', {
        usuario: userLimpio,
        password,
        rol,
      })

      if (onUsuarioCreado) {
        onUsuarioCreado(res.data)
      }
      onClose?.()
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo crear el usuario')
    } finally {
      setGuardando(false)
    }
  }

  return createPortal(
    <div
      data-ui="modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200 touch-none overscroll-contain"
      onClick={() => {
        if (!guardando) onClose?.()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Nuevo Usuario"
    >
      <div
        data-ui="modal"
        className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-surface text-text p-6 animate-in zoom-in-95 duration-200 touch-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div data-ui="modal-header" className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div>
            <h3 className="font-bold text-base text-text uppercase tracking-wider font-display">
              Nuevo Usuario
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Creá una cuenta para administradores o visitantes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-border bg-base text-text-muted hover:text-orange-500 hover:border-orange-500/40 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Cerrar modal"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2 text-xs font-medium text-danger">
              {error}
            </div>
          )}

          {/* Campo Usuario */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Nombre de Usuario <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: operador1"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              required
              autoFocus
              className="h-10 rounded-xl border border-border bg-page px-3 text-sm text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
            />
          </div>

          {/* Campo Contraseña */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Contraseña <span className="text-orange-500">*</span>
            </label>
            <input
              type="password"
              placeholder="Mínimo 4 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-10 rounded-xl border border-border bg-page px-3 text-sm text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
            />
          </div>

          {/* Campo Rol */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Rol de Acceso <span className="text-orange-500">*</span>
            </label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="h-10 rounded-xl border border-border bg-page px-3 text-sm font-semibold text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
            >
              <option value="visitante">Visitante (Solo lectura)</option>
              <option value="admin">Administrador (Control total)</option>
            </select>
          </div>

          {/* Botones de acción */}
          <div data-ui="modal-footer" className="mt-2 flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="h-9 px-4 rounded-xl border border-border bg-surface text-xs font-semibold text-text-muted hover:text-text transition-colors inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !usuario.trim() || !password}
              className="h-9 px-5 rounded-xl border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 font-display font-bold text-xs uppercase active:scale-95 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              {guardando ? 'Guardando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
