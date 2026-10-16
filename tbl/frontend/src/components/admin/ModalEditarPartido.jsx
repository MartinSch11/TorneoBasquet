import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import api from '../../services/api'
import { IconClose } from '../ui/Icon'
import useBodyLock from '../../hooks/useBodyLock'

export default function ModalEditarPartido({
  isOpen,
  onClose,
  partido,
  onPartidoActualizado,
  onPartidoEliminado,
  canchas = [],
}) {
  useBodyLock(isOpen)
  const [fechaNumero, setFechaNumero] = useState(1)
  const [fechaDia, setFechaDia] = useState('')
  const [horario, setHorario] = useState('')
  const [cancha, setCancha] = useState('')
  const [fase, setFase] = useState('FASE REGULAR')
  const [modoOtraCancha, setModoOtraCancha] = useState(false)
  const [otraCanchaTexto, setOtraCanchaTexto] = useState('')
  const [guardando, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && partido) {
      setFechaNumero(partido.numero_fecha || 1)
      setFechaDia(partido.fecha ? String(partido.fecha).split('T')[0] : '')
      const rawHora = partido.horario ? String(partido.horario).slice(0, 5) : ''
      setHorario(rawHora)
      setFase(partido.fase || 'FASE REGULAR')

      const canchaVal = partido.cancha || ''
      const existeEnLista = canchas.some((c) => c.nombre.toLowerCase() === canchaVal.toLowerCase())
      if (canchaVal && !existeEnLista) {
        setModoOtraCancha(true)
        setOtraCanchaTexto(canchaVal)
        setCancha('')
      } else {
        setModoOtraCancha(false)
        setOtraCanchaTexto('')
        setCancha(canchaVal)
      }
      setError('')
      setSaving(false)
    }
  }, [isOpen, partido, canchas])

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

  if (!isOpen || !partido) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const canchaFinal = modoOtraCancha ? otraCanchaTexto.trim() : cancha.trim()
    const horarioFinal = horario ? (horario.includes(':') && horario.split(':').length === 2 ? `${horario}:00` : horario) : null

    try {
      setSaving(true)
      const payload = {
        fecha_numero: parseInt(fechaNumero, 10) || 1,
        fecha_dia: fechaDia || null,
        horario: horarioFinal,
        cancha: canchaFinal || null,
        fase: fase || 'FASE REGULAR',
      }

      await api.patch(`/partidos/${partido.id}`, payload)
      onPartidoActualizado?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al actualizar el partido')
    } finally {
      setSaving(false)
    }
  }

  const handleVolverAPendiente = async () => {
    const confirmar = window.confirm(
      '¿Volver este partido al estado PENDIENTE? Se borrará el tanteador y las estadísticas registradas.'
    )
    if (!confirmar) return

    try {
      setSaving(true)
      await api.patch(`/partidos/${partido.id}`, { jugado: false })
      onPartidoActualizado?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo reiniciar el partido a pendiente')
    } finally {
      setSaving(false)
    }
  }

  const handleEliminar = async () => {
    const confirmar = window.confirm(
      `¿Eliminar definitivamente el partido entre ${partido.equipo_local} y ${partido.equipo_visitante}?`
    )
    if (!confirmar) return

    try {
      setSaving(true)
      await api.delete(`/partidos/${partido.id}`)
      onPartidoEliminado?.(partido.id)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo eliminar el partido')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div
      data-ui="modal-overlay"
      className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-200 touch-none overscroll-contain"
      onClick={() => {
        if (!guardando) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        data-ui="modal"
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6 relative z-[1000001] animate-in zoom-in-95 duration-200 text-text touch-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div data-ui="modal-header" className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div>
            <h3 className="font-display text-base font-bold uppercase tracking-wider text-text">
              Editar Partido Programado
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {partido.equipo_local} vs {partido.equipo_visitante}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text p-1 transition-colors rounded-lg hover:bg-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Cerrar modal"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2 text-xs font-medium text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Número de Fecha */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Fecha / Jornada #
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={fechaNumero}
                onChange={(e) => setFechaNumero(e.target.value)}
                className="h-9 rounded-xl border border-border bg-page px-3 text-xs font-semibold text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
                required
              />
            </div>

            {/* Fase del torneo */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Fase de Competencia
              </label>
              <select
                value={fase}
                onChange={(e) => setFase(e.target.value)}
                className="h-9 rounded-xl border border-border bg-page px-3 text-xs font-semibold text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              >
                <option value="FASE REGULAR">FASE REGULAR</option>
                <option value="OCTAVOS DE FINAL">OCTAVOS DE FINAL</option>
                <option value="CUARTOS DE FINAL">CUARTOS DE FINAL</option>
                <option value="SEMIFINAL">SEMIFINAL</option>
                <option value="FINAL">FINAL</option>
                <option value="PROMOCION / DESCENSO">PROMOCION / DESCENSO</option>
              </select>
            </div>

            {/* Día / Fecha Calendario */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Día del Partido
              </label>
              <input
                type="date"
                value={fechaDia}
                onChange={(e) => setFechaDia(e.target.value)}
                className="h-9 rounded-xl border border-border bg-page px-3 text-xs font-semibold text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              />
            </div>

            {/* Horario */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Horario (hs)
              </label>
              <input
                type="time"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="h-9 rounded-xl border border-border bg-page px-3 text-xs font-semibold text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Cancha / Sede */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Sede / Cancha
              </label>
              <button
                type="button"
                onClick={() => setModoOtraCancha(!modoOtraCancha)}
                className="text-[10px] text-orange-500 hover:underline font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500 rounded px-1"
              >
                {modoOtraCancha ? 'Elegir de lista oficial' : '+ Otra sede manual'}
              </button>
            </div>

            {modoOtraCancha ? (
              <input
                type="text"
                value={otraCanchaTexto}
                onChange={(e) => setOtraCanchaTexto(e.target.value)}
                placeholder="Nombre de la cancha o club sede…"
                className="h-9 rounded-xl border border-border bg-page px-3 text-xs font-semibold text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              />
            ) : (
              <select
                value={cancha}
                onChange={(e) => setCancha(e.target.value)}
                className="h-9 rounded-xl border border-border bg-page px-3 text-xs font-semibold text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              >
                <option value="">Sin cancha asignada</option>
                {canchas.map((c) => (
                  <option key={c.id} value={c.nombre}>
                    {c.nombre} {c.ciudad ? `(${c.ciudad})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Acciones de gestión */}
          <div data-ui="modal-footer" className="pt-3 border-t border-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleEliminar}
                disabled={guardando}
                className="h-9 px-3 w-full sm:w-auto rounded-xl border border-danger/40 bg-danger/10 hover:bg-danger/20 text-danger text-xs font-semibold transition-colors disabled:opacity-50 inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
              >
                Eliminar Partido
              </button>

              {partido.jugado && (
                <button
                  type="button"
                  onClick={handleVolverAPendiente}
                  disabled={guardando}
                  className="h-9 px-3 w-full sm:w-auto rounded-xl border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-semibold transition-colors disabled:opacity-50 inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  title="Reiniciar partido y borrar resultado"
                >
                  Volver a Pendiente
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={guardando}
                className="h-9 px-4 flex-1 sm:flex-none rounded-xl border border-border bg-surface text-xs font-semibold text-text-muted hover:text-text transition-colors inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="h-9 px-5 flex-1 sm:flex-none rounded-xl border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 font-display font-bold text-xs uppercase active:scale-95 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 whitespace-nowrap"
              >
                {guardando ? 'Guardando…' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
