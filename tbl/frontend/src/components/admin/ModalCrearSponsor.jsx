import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import api from '../../services/api'
import { IconClose } from '../ui/Icon'
import useBodyLock from '../../hooks/useBodyLock'

export default function ModalCrearSponsor({ isOpen, onClose, sponsorAEditar, onSponsorGuardado }) {
  useBodyLock(isOpen)
  const [nombre, setNombre] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [urlSitio, setUrlSitio] = useState('')
  const [orden, setOrden] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (sponsorAEditar) {
        setNombre(sponsorAEditar.nombre || '')
        setLogoUrl(sponsorAEditar.logo_url || '')
        setUrlSitio(sponsorAEditar.url_sitio || '')
        setOrden(sponsorAEditar.orden ?? 0)
      } else {
        setNombre('')
        setLogoUrl('')
        setUrlSitio('')
        setOrden(0)
      }
      setError('')
    }
  }, [isOpen, sponsorAEditar])

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

    if (!nombre.trim()) {
      setError('El nombre del sponsor es obligatorio.')
      return
    }
    if (!logoUrl.trim()) {
      setError('La URL del logotipo es obligatoria.')
      return
    }

    try {
      setGuardando(true)
      const payload = {
        nombre: nombre.trim(),
        logo_url: logoUrl.trim(),
        url_sitio: urlSitio.trim() || null,
        orden: Number(orden) || 0,
      }

      if (sponsorAEditar) {
        await api.patch(`/sponsors/${sponsorAEditar.id}`, payload)
      } else {
        await api.post('/sponsors', payload)
      }

      onSponsorGuardado()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar el sponsor.')
    } finally {
      setGuardando(false)
    }
  }

  return createPortal(
    <div
      data-ui="modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-200 touch-none overscroll-contain"
      onClick={() => {
        if (!guardando) onClose?.()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        data-ui="modal"
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6 relative animate-in zoom-in-95 duration-200 touch-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div data-ui="modal-header" className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div>
            <h3 className="font-display text-base font-bold uppercase tracking-wider text-text">
              {sponsorAEditar ? 'Editar Sponsor' : 'Nuevo Sponsor'}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {sponsorAEditar
                ? 'Modificá los datos del auspiciante seleccionado.'
                : 'Registrá un nuevo anunciante para la marquesina oficial.'}
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

        {error && (
          <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2 text-xs font-medium text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Nombre */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Nombre de la Marca / Empresa <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Banco de Córdoba"
              className="h-10 rounded-xl border border-border bg-page px-3 text-sm text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              disabled={guardando}
              autoFocus
            />
          </div>

          {/* Logo URL */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              URL del Logotipo <span className="text-orange-500">*</span>
            </label>
            <input
              type="url"
              required
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://ejemplo.com/logo.png"
              className="h-10 rounded-xl border border-border bg-page px-3 text-sm text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              disabled={guardando}
            />
            {logoUrl && (
              <div className="mt-1.5 flex items-center gap-3 p-2 rounded-xl border border-border bg-base">
                <span className="text-[11px] text-text-muted font-medium">Vista previa:</span>
                <img
                  src={logoUrl}
                  alt="Vista previa"
                  width="120"
                  height="32"
                  className="h-8 max-w-[120px] object-contain rounded bg-surface p-1 border border-border"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          {/* URL del Sitio */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Sitio Web Oficial (opcional)
            </label>
            <input
              type="url"
              value={urlSitio}
              onChange={(e) => setUrlSitio(e.target.value)}
              placeholder="https://www.bancodecordoba.com.ar"
              className="h-10 rounded-xl border border-border bg-page px-3 text-sm text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              disabled={guardando}
            />
          </div>

          {/* Orden de Visualización */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Orden de Visualización
            </label>
            <input
              type="number"
              min="0"
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              placeholder="0"
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
              className="h-9 px-4 rounded-xl border border-border bg-surface text-xs font-semibold text-text-muted hover:text-text transition-colors inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="h-9 px-5 rounded-xl border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 font-display font-bold text-xs uppercase active:scale-95 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              {guardando ? 'Guardando...' : sponsorAEditar ? 'Guardar Cambios' : 'Registrar Sponsor'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
