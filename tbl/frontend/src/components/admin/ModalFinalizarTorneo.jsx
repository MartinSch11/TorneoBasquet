import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import api from '../../services/api'

export default function ModalFinalizarTorneo({
  isOpen,
  torneo,
  onClose,
  onConfirmar,
}) {
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [partidosPendientes, setPartidosPendientes] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen || !torneo) return

    let cancelado = false
    async function auditarPartidos() {
      setCargando(true)
      setError('')
      try {
        const res = await api.get(`/torneos/${torneo.id}/proximos-partidos`).catch(() => ({ data: [] }))
        if (!cancelado) {
          setPartidosPendientes(res.data || [])
        }
      } catch (err) {
        if (!cancelado) {
          setPartidosPendientes([])
        }
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    auditarPartidos()
    return () => {
      cancelado = true
    }
  }, [isOpen, torneo])

  if (!isOpen || !torneo) return null

  const handleConfirmar = async () => {
    try {
      setProcesando(true)
      setError('')
      await onConfirmar(torneo)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo finalizar el torneo.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <Modal titulo="Finalizar Torneo" onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col gap-4 text-xs">
        {/* Identificador del torneo */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 uppercase tracking-wide">
            {torneo.nombre}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-page text-text-muted border border-border uppercase">
            {torneo.categoria}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-page text-text-muted border border-border">
            {torneo.temporada}
          </span>
          {torneo.grupo && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-page text-text-muted border border-border uppercase">
              {torneo.grupo}
            </span>
          )}
        </div>

        {/* Pregunta principal */}
        <p className="font-display text-base font-bold text-text leading-snug">
          ¿Estás seguro que deseas finalizar el torneo?
        </p>

        {/* Estado y advertencia de partidos */}
        {cargando ? (
          <div className="p-3.5 rounded-xl border border-border bg-page flex items-center gap-2.5 text-text-muted">
            <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin shrink-0" />
            <span>Verificando calendario de partidos...</span>
          </div>
        ) : partidosPendientes.length > 0 ? (
          <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-start gap-3">
            <svg
              className="w-5 h-5 shrink-0 text-amber-500 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-xs leading-relaxed">
              Este torneo todavía tiene{' '}
              <strong className="font-bold underline decoration-amber-500/50 underline-offset-2">
                {partidosPendientes.length} partido(s) programado(s)
              </strong>{' '}
              sin disputar. Si lo finalizás ahora, no se podrán jugar ni cargar sus estadísticas hasta que reactives el torneo.
            </p>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-start gap-3">
            <svg
              className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-xs leading-relaxed">
              Todos los partidos programados se encuentran disputados y con planilla guardada. Al confirmar, el torneo quedará finalizado y no se podrán programar nuevos partidos a menos que lo reactives.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-500">
            {error}
          </div>
        )}

        {/* Botones de acción unificados con el sistema */}
        <div data-ui="modal-footer" className="mt-1 flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={procesando}
            className="h-9 px-4 rounded-xl border border-border bg-surface text-xs font-semibold text-text-muted hover:text-text transition-colors inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={procesando || cargando}
            className="h-9 px-5 rounded-xl border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 font-display font-bold text-xs uppercase active:scale-95 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            {procesando ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                <span>Finalizando...</span>
              </>
            ) : (
              'Finalizar Torneo'
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
