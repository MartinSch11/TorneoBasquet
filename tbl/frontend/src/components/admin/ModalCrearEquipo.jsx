import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import api from '../../services/api'
import { IconClose } from '../ui/Icon'
import useBodyLock from '../../hooks/useBodyLock'

export default function ModalCrearEquipo({
  isOpen,
  onClose,
  onEquipoCreado,
  onEquipoGuardado,
  equipoAEditar = null,
  torneos = [],
  defaultTorneoId = '',
}) {
  useBodyLock(isOpen)
  const [nombre, setNombre] = useState('')
  const [torneoId, setTorneoId] = useState(defaultTorneoId || '')
  const [urlEscudo, setUrlEscudo] = useState('')
  const [archivoEscudo, setArchivoEscudo] = useState(null)
  const [previewEscudo, setPreviewEscudo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [progresoTexto, setProgresoTexto] = useState('')
  const [error, setError] = useState('')

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      if (equipoAEditar) {
        setNombre(equipoAEditar.nombre || '')
        setUrlEscudo(equipoAEditar.escudo_url || '')
        setPreviewEscudo(equipoAEditar.escudo_url || '')
      } else {
        setNombre('')
        setTorneoId(defaultTorneoId || (torneos.length > 0 ? torneos[0].id : ''))
        setUrlEscudo('')
        setPreviewEscudo('')
      }
      setArchivoEscudo(null)
      setGuardando(false)
      setProgresoTexto('')
      setError('')
    }
  }, [isOpen, equipoAEditar, defaultTorneoId, torneos])

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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Por favor seleccioná un archivo de imagen válido')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar los 5 MB')
      return
    }

    setError('')
    setArchivoEscudo(file)
    setUrlEscudo('')
    const objectUrl = URL.createObjectURL(file)
    setPreviewEscudo(objectUrl)
  }

  const handleUrlChange = (e) => {
    const val = e.target.value
    setUrlEscudo(val)
    if (archivoEscudo) {
      setArchivoEscudo(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    setPreviewEscudo(val)
  }

  const handleQuitarImagen = () => {
    setArchivoEscudo(null)
    setUrlEscudo('')
    setPreviewEscudo('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) {
      setError('El nombre del equipo es obligatorio')
      return
    }

    try {
      setGuardando(true)
      let finalEscudoUrl = urlEscudo.trim() || null

      // Si seleccionó un archivo local, subirlo primero
      if (archivoEscudo) {
        setProgresoTexto('Subiendo imagen...')
        const formData = new FormData()
        formData.append('file', archivoEscudo)

        const resUpload = await api.post('/equipos/upload-escudo', formData)
        finalEscudoUrl = resUpload.data.url
      }

      let resEquipo
      if (equipoAEditar) {
        setProgresoTexto('Actualizando equipo...')
        resEquipo = await api.patch(`/equipos/${equipoAEditar.id}`, {
          nombre: nombreLimpio,
          escudo_url: finalEscudoUrl,
        })
      } else {
        setProgresoTexto('Creando equipo...')
        resEquipo = await api.post('/equipos', {
          nombre: nombreLimpio,
          escudo_url: finalEscudoUrl,
          torneo_id: torneoId ? parseInt(torneoId, 10) : null,
        })
      }

      if (equipoAEditar) {
        if (onEquipoGuardado) {
          onEquipoGuardado(resEquipo.data)
        }
      } else {
        if (onEquipoCreado) {
          onEquipoCreado(resEquipo.data)
        }
      }
      onClose?.()
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Tu sesión expiró o no tenés permisos de administrador. Por favor volvé a iniciar sesión.')
      } else {
        setError(err.response?.data?.detail || (equipoAEditar ? 'No se pudo actualizar el equipo' : 'No se pudo crear el equipo'))
      }
    } finally {
      setGuardando(false)
      setProgresoTexto('')
    }
  }

  const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    nombre.trim() || 'Equipo',
  )}&background=F97316&color=fff&size=128`

  return createPortal(
    <div
      data-ui="modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200 touch-none overscroll-contain"
      onClick={() => {
        if (!guardando) onClose?.()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Nuevo Equipo"
    >
      <div
        data-ui="modal"
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-surface text-text p-6 animate-in zoom-in-95 duration-200 touch-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div data-ui="modal-header" className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div>
            <h3 className="font-bold text-base text-text uppercase tracking-wider font-display">
              {equipoAEditar ? 'Editar Equipo' : 'Nuevo Equipo'}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {equipoAEditar
                ? 'Modificá el nombre y el escudo oficial del club.'
                : 'Registrá un nuevo club participante y su escudo oficial.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-border bg-base text-text-muted hover:text-orange-500 hover:border-orange-500/40 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Cerrar"
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

          {/* Nombre del equipo */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Nombre del Equipo <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Huracán Basket"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              autoFocus
              className="h-10 rounded-xl border border-border bg-page px-3 text-sm text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
            />
          </div>

          {/* Inscribir en Torneo (solo al crear) */}
          {!equipoAEditar && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Inscribir en Torneo
              </label>
              <select
                value={torneoId}
                onChange={(e) => setTorneoId(e.target.value)}
                className="h-10 rounded-xl border border-border bg-page px-3 text-sm font-semibold text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              >
                <option value="">(Ninguno)</option>
                {torneos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} - {t.temporada} ({t.categoria})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Carga y vista previa del Escudo */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Escudo / Imagen del Equipo
            </label>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-page">
              {/* Vista previa del escudo */}
              <div className="relative shrink-0 h-16 w-16 flex items-center justify-center">
                <img
                  src={previewEscudo || avatarFallback}
                  alt="Vista previa del escudo"
                  width="64"
                  height="64"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    e.target.src = avatarFallback
                  }}
                />
              </div>

              {/* Botón de subida y URL */}
              <div className="flex-1 flex flex-col gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  onChange={handleFileChange}
                  className="hidden"
                  id="modal-escudo-file"
                />

                <div className="flex items-center gap-2">
                  <label
                    htmlFor="modal-escudo-file"
                    className="inline-flex items-center justify-center h-8 px-3 rounded-lg border border-border bg-surface hover:border-orange-500/50 hover:text-orange-500 text-xs font-semibold text-text cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  >
                    Subir archivo
                  </label>
                  {(archivoEscudo || urlEscudo) && (
                    <button
                      type="button"
                      onClick={handleQuitarImagen}
                      className="h-8 px-2 text-xs text-rose-500 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 rounded"
                    >
                      Quitar
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="O pegar URL de imagen (https://...)"
                  value={urlEscudo}
                  onChange={handleUrlChange}
                  className="w-full h-8 px-2.5 rounded-lg border border-border bg-surface text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 text-xs"
                />
              </div>
            </div>
            <p className="text-[10px] text-text-muted mt-1">
              Formatos soportados: PNG, JPG, WebP o SVG (máx. 5 MB). Si no se carga ninguna, se generará un avatar con el nombre.
            </p>
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
              disabled={guardando || !nombre.trim()}
              className="h-9 px-5 rounded-xl border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 font-display font-bold text-xs uppercase active:scale-95 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              {guardando ? progresoTexto || 'Guardando...' : equipoAEditar ? 'Guardar Cambios' : 'Crear Equipo'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
