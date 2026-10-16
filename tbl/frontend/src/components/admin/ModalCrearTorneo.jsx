import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import api from '../../services/api'
import { IconClose } from '../ui/Icon'

export default function ModalCrearTorneo({
  isOpen,
  onClose,
  onTorneoCreado,
  onTorneoGuardado,
  torneoAEditar = null,
}) {
  const [nombre, setNombre] = useState('LBA')
  const [categoria, setCategoria] = useState('')
  const [temporada, setTemporada] = useState(String(new Date().getFullYear()))
  const [edicion, setEdicion] = useState('1')
  const [grupo, setGrupo] = useState('')
  const [estado, setEstado] = useState('activo')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (torneoAEditar) {
        setNombre(torneoAEditar.nombre || 'LBA')
        setCategoria(torneoAEditar.categoria || '')
        setTemporada(torneoAEditar.temporada || String(new Date().getFullYear()))
        setEdicion(String(torneoAEditar.edicion || 1))
        setGrupo(torneoAEditar.grupo || '')
        setEstado(torneoAEditar.estado || 'activo')
      } else {
        setNombre('LBA')
        setCategoria('')
        setTemporada(String(new Date().getFullYear()))
        setEdicion('1')
        setGrupo('')
        setEstado('activo')
      }
      setError('')
      setGuardando(false)
    }
  }, [isOpen, torneoAEditar])

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
    const cat = categoria.trim()
    const temp = temporada.trim()

    if (!nom) {
      setError('El nombre del torneo es obligatorio')
      return
    }
    if (!cat) {
      setError('La categoría es obligatoria (ej: LBA B)')
      return
    }
    if (!temp) {
      setError('La temporada es obligatoria (ej: 2026)')
      return
    }

    try {
      setGuardando(true)
      const payload = {
        nombre: nom,
        categoria: cat,
        temporada: temp,
        edicion: parseInt(edicion, 10) || 1,
        grupo: grupo.trim() || null,
        estado,
      }

      let res
      if (torneoAEditar) {
        res = await api.patch(`/torneos/${torneoAEditar.id}`, payload)
      } else {
        res = await api.post('/torneos', payload)
      }

      if (onTorneoGuardado) {
        onTorneoGuardado(res.data)
      }
      if (onTorneoCreado) {
        onTorneoCreado(res.data)
      }
      onClose?.()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar el torneo')
    } finally {
      setGuardando(false)
    }
  }

  const categoriasSugeridas = ['LBA A', 'LBA B', 'LBA C', 'MÁS 35', 'PRIMERA']

  return createPortal(
    <div
      data-ui="modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200"
      onClick={() => {
        if (!guardando) onClose?.()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Nuevo Torneo"
    >
      <div
        data-ui="modal"
        className="relative w-full max-w-lg rounded-2xl border border-border bg-surface text-text p-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div data-ui="modal-header" className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div>
            <h3 className="font-bold text-base text-text uppercase tracking-wider font-display">
              {torneoAEditar ? 'Editar Torneo / Categoría' : 'Nuevo Torneo / Categoría'}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {torneoAEditar
                ? 'Modificá la configuración del torneo o cambiá su estado oficial.'
                : 'Creá una nueva división o torneo para organizar equipos y partidos.'}
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

          {/* Fila Nombre y Edición */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Nombre de Liga <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: LBA"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="h-10 rounded-xl border border-border bg-page px-3 text-sm text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              />
            </div>
            <div className="col-span-1 flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Edición
              </label>
              <input
                type="number"
                min="1"
                value={edicion}
                onChange={(e) => setEdicion(e.target.value)}
                className="h-10 text-center rounded-xl border border-border bg-page px-2 text-sm text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Categoría */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Categoría / División <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: LBA B, LBA C, MÁS 35..."
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              required
              autoFocus
              className="h-10 rounded-xl border border-border bg-page px-3 text-sm text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
            />
            {/* Sugerencias de categorías rápidas */}
            <div className="flex flex-wrap gap-1.5 mt-1">
              {categoriasSugeridas.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setCategoria(sug)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-border bg-base hover:border-orange-500/50 hover:text-orange-500 text-text-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Fila Temporada y Estado */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Temporada <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: 2026"
                value={temporada}
                onChange={(e) => setTemporada(e.target.value)}
                required
                className="h-10 rounded-xl border border-border bg-page px-3 text-sm text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Estado
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="h-10 rounded-xl border border-border bg-page px-3 text-sm font-semibold text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              >
                <option value="activo">Activo</option>
                <option value="inscripcion">Inscripción</option>
                <option value="finalizado">Finalizado</option>
              </select>
              {estado === 'finalizado' && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  Al marcarlo como finalizado se cerrará el fixture y no se podrán programar nuevos partidos.
                </span>
              )}
            </div>
          </div>

          {/* Grupo opcional */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Grupo (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: GRUPO A, ZONA NORTE (dejar vacío si no aplica)"
              value={grupo}
              onChange={(e) => setGrupo(e.target.value)}
              className="h-10 rounded-xl border border-border bg-page px-3 text-sm text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
            />
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
              disabled={guardando || !categoria.trim() || !nombre.trim()}
              className="h-9 px-5 rounded-xl border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 font-display font-bold text-xs uppercase active:scale-95 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              {guardando ? 'Guardando...' : torneoAEditar ? 'Guardar Cambios' : 'Crear Torneo'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
