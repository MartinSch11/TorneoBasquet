import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import api from '../../services/api'
import { IconClose } from '../ui/Icon'

export default function ModalCrearCancha({
  isOpen,
  onClose,
  onCanchaGuardada,
  canchaAEditar = null,
}) {
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [ciudad, setCiudad] = useState('Córdoba')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (canchaAEditar) {
        setNombre(canchaAEditar.nombre || '')
        setDireccion(canchaAEditar.direccion || '')
        setCiudad(canchaAEditar.ciudad || 'Córdoba')
      } else {
        setNombre('')
        setDireccion('')
        setCiudad('Córdoba')
      }
      setError('')
      setGuardando(false)
    }
  }, [isOpen, canchaAEditar])

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

    const nom = nombre.trim()
    if (!nom) {
      setError('El nombre de la cancha es obligatorio.')
      return
    }

    setGuardando(true)
    try {
      const payload = {
        nombre: nom,
        direccion: direccion.trim() || null,
        ciudad: ciudad.trim() || 'Córdoba',
      }

      let res
      if (canchaAEditar) {
        res = await api.patch(`/canchas/${canchaAEditar.id}`, payload)
      } else {
        res = await api.post('/canchas', payload)
      }

      onCanchaGuardada?.(res.data)
      onClose?.()
    } catch (err) {
      setError(err.response?.data?.detail || 'Ocurrió un error al guardar la cancha.')
    } finally {
      setGuardando(false)
    }
  }

  return createPortal(
    <div
      data-ui="modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div data-ui="modal" className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 animate-in zoom-in-95 duration-200">
        {/* Cabecera del Modal */}
        <div data-ui="modal-header" className="flex items-center justify-between pb-3 mb-4 border-b border-border">
          <div>
            <h3 className="font-display text-base font-bold uppercase tracking-wider text-text">
              {canchaAEditar ? 'Editar Cancha / Sede' : 'Nueva Cancha / Sede'}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {canchaAEditar
                ? 'Modificá los datos oficiales de la sede deportiva.'
                : 'Registrá una cancha para la programación de partidos oficiales.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-border bg-base text-text-muted hover:text-orange-500 hover:border-orange-500/40 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Cerrar"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2 text-xs font-medium text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Nombre de la Cancha */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Nombre de la Cancha <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Polideportivo Central o Cancha 1"
              className="h-10 rounded-xl border border-border bg-page px-3 text-sm text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              disabled={guardando}
              autoFocus
            />
          </div>

          {/* Dirección */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Dirección / Ubicación
            </label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Ej: Av. Costanera 1100"
              className="h-10 rounded-xl border border-border bg-page px-3 text-sm text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              disabled={guardando}
            />
          </div>

          {/* Ciudad */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Ciudad / Localidad
            </label>
            <input
              type="text"
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              placeholder="Ej: Córdoba"
              className="h-10 rounded-xl border border-border bg-page px-3 text-sm text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              disabled={guardando}
            />
          </div>

          {/* Botones de Acción */}
          <div data-ui="modal-footer" className="mt-2 flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="h-9 px-4 rounded-xl border border-border text-xs font-semibold text-text-muted hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="h-9 px-5 rounded-xl border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 font-display font-bold text-xs uppercase active:scale-95 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              {guardando ? 'Guardando...' : canchaAEditar ? 'Guardar Cambios' : 'Registrar Cancha'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
