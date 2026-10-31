import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import api from '../../services/api'
import { IconClose, IconSearch, IconCheck, IconRefresh } from '../ui/Icon'
import EscudoEquipo from '../ui/EscudoEquipo'
import Spinner from '../ui/Spinner'
import useBodyLock from '../../hooks/useBodyLock'
import { useToast } from '../../context/ToastContext'

export default function ModalEquiposTorneo({
  isOpen,
  onClose,
  torneo,
  torneosDisponibles = [],
  onEquiposActualizados,
}) {
  useBodyLock(isOpen)
  const { toast } = useToast()

  const [equipos, setEquipos] = useState([])
  const [loading, setLoading] = useState(true)
  const [procesandoId, setProcesandoId] = useState(null)
  const [copiando, setCopiando] = useState(false)
  const [torneoOrigenId, setTorneoOrigenId] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos') // 'todos' | 'inscriptos' | 'no_inscriptos'

  const cargarEquiposTorneo = async (mostrarSpinner = true) => {
    if (!torneo?.id) return
    try {
      if (mostrarSpinner) setLoading(true)
      const res = await api.get(`/torneos/${torneo.id}/equipos`)
      setEquipos(res.data || [])
    } catch (err) {
      toast.error('Error al cargar la lista de equipos del torneo.')
    } finally {
      if (mostrarSpinner) setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && torneo?.id) {
      cargarEquiposTorneo(true)
      setBusqueda('')
      setFiltro('todos')
      setTorneoOrigenId('')
    }
  }, [isOpen, torneo?.id])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !procesandoId && !copiando) {
        onClose?.()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, procesandoId, copiando, onClose])

  if (!isOpen || !torneo) return null

  const handleToggleEquipo = async (equipo) => {
    if (procesandoId) return

    // Si ya está inscripto y jugó partidos, avisar y no permitir desinscribir
    if (equipo.inscripto && equipo.partidos_jugados > 0) {
      toast.error(
        `"${equipo.nombre}" no se puede quitar porque ya tiene ${equipo.partidos_jugados} partido(s) jugado(s) en este torneo.`
      )
      return
    }

    // Si no está inscripto pero ya compite en otra categoría de la misma temporada, bloquear con advertencia
    if (!equipo.inscripto && equipo.otra_categoria) {
      toast.warning(
        `"${equipo.nombre}" ya está inscripto en la categoría ${equipo.otra_categoria} (${torneo.temporada}). Primero debés darlo de baja en esa categoría.`
      )
      return
    }

    const estadoPrevio = equipo.inscripto

    // Actualización optimista inmediata en UI sin mover el scroll
    setEquipos((prev) =>
      prev.map((eq) =>
        eq.id === equipo.id ? { ...eq, inscripto: !estadoPrevio } : eq
      )
    )
    setProcesandoId(equipo.id)

    try {
      if (estadoPrevio) {
        // Desinscribir
        await api.delete(`/torneos/${torneo.id}/equipos/${equipo.id}`)
      } else {
        // Inscribir
        await api.post(`/torneos/${torneo.id}/equipos`, { equipo_id: equipo.id })
      }
      // Refresco en segundo plano sin pantalla de carga ni reseteo de scroll
      await cargarEquiposTorneo(false)
      onEquiposActualizados?.()
    } catch (err) {
      // Revertir cambio optimista en caso de error
      setEquipos((prev) =>
        prev.map((eq) =>
          eq.id === equipo.id ? { ...eq, inscripto: estadoPrevio } : eq
        )
      )
      const msg = err.response?.data?.detail || 'Error al actualizar la inscripción del equipo.'
      toast.error(msg)
    } finally {
      setProcesandoId(null)
    }
  }

  const handleCopiarEquipos = async () => {
    if (!torneoOrigenId) {
      toast.error('Seleccioná un torneo para copiar los equipos.')
      return
    }

    const tOrigen = torneosDisponibles.find((t) => String(t.id) === String(torneoOrigenId))
    const confirmar = window.confirm(
      `¿Copiar los equipos de "${tOrigen?.nombre} - ${tOrigen?.categoria} (${tOrigen?.temporada})" a este torneo? Los equipos ya inscriptos se mantendrán sin cambios.`
    )
    if (!confirmar) return

    setCopiando(true)
    try {
      const res = await api.post(`/torneos/${torneo.id}/copiar-equipos`, {
        torneo_origen_id: parseInt(torneoOrigenId, 10),
      })
      toast.success(res.data?.mensaje || 'Equipos copiados exitosamente.')
      await cargarEquiposTorneo(false)
      onEquiposActualizados?.()
      setTorneoOrigenId('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudieron copiar los equipos.')
    } finally {
      setCopiando(false)
    }
  }

  const totalInscriptos = equipos.filter((eq) => eq.inscripto).length
  const totalLibres = equipos.filter((eq) => !eq.inscripto && !eq.otra_categoria).length
  const otrosTorneos = torneosDisponibles.filter((t) => t.id !== torneo.id)

  // Filtrado de equipos
  const equiposFiltrados = equipos.filter((eq) => {
    if (filtro === 'inscriptos' && !eq.inscripto) return false
    if (filtro === 'no_inscriptos' && (eq.inscripto || eq.otra_categoria)) return false
    if (!busqueda) return true
    return eq.nombre.toLowerCase().includes(busqueda.toLowerCase())
  })

  return createPortal(
    <div
      data-ui="modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200 touch-none overscroll-contain"
      onClick={() => {
        if (!procesandoId && !copiando) onClose?.()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Equipos Participantes del Torneo"
    >
      <div
        data-ui="modal"
        className="relative w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-2xl border border-border bg-surface text-text p-4 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden touch-auto overscroll-contain" /* taste-skill-ignore */
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div data-ui="modal-header" className="flex items-start justify-between gap-3 pb-3 border-b border-border shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-text uppercase tracking-wider font-display">
                Equipos Participantes
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 whitespace-nowrap shrink-0">
                {totalInscriptos} {totalInscriptos === 1 ? 'inscripto' : 'inscriptos'}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5 truncate">
              <span className="font-semibold text-text">{torneo.nombre}</span> · {torneo.categoria} ({torneo.temporada})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(procesandoId) || copiando}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-base text-text-muted hover:text-orange-500 hover:border-orange-500/40 transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
            aria-label="Cerrar modal"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* Panel de Copiar Equipos de Otro Torneo */}
        {otrosTorneos.length > 0 && (
          <div className="mt-3 p-2.5 sm:p-3 rounded-xl border border-orange-500/25 bg-orange-500/5 dark:bg-orange-500/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <IconRefresh className="w-4 h-4 text-orange-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-text leading-tight">Copiar equipos de otro torneo</p>
                <p className="text-[11px] text-text-muted leading-tight">
                  Importá los equipos de una temporada anterior.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={torneoOrigenId}
                onChange={(e) => setTorneoOrigenId(e.target.value)}
                disabled={copiando}
                className="flex-1 min-w-0 sm:w-56 h-8 px-2 rounded-lg border border-border bg-surface text-xs text-text outline-none focus:border-orange-500 transition-colors"
              >
                <option value="">Seleccionar torneo origen…</option>
                {otrosTorneos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} - {t.categoria} ({t.temporada})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleCopiarEquipos}
                disabled={!torneoOrigenId || copiando}
                className="h-8 px-3 rounded-lg border border-orange-500/40 bg-orange-500/20 hover:bg-orange-500/30 text-orange-600 dark:text-orange-400 font-bold text-xs uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
              >
                {copiando ? 'Copiando…' : 'Copiar'}
              </button>
            </div>
          </div>
        )}

        {/* Filtros de Pestaña y Buscador */}
        <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-base p-1 text-center shrink-0 sm:w-auto">
            <button
              type="button"
              onClick={() => setFiltro('todos')}
              className={`h-7 px-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors border flex items-center justify-center gap-1 cursor-pointer truncate ${filtro === 'todos'
                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                : 'text-text-muted hover:text-text border-transparent'
                }`}
            >
              <span>Todos</span>
              <span className="opacity-80 tabular-nums">({equipos.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltro('inscriptos')}
              className={`h-7 px-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors border flex items-center justify-center gap-1 cursor-pointer truncate ${filtro === 'inscriptos'
                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                : 'text-text-muted hover:text-text border-transparent'
                }`}
            >
              <span>Inscriptos</span>
              <span className="opacity-80 tabular-nums">({totalInscriptos})</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltro('no_inscriptos')}
              className={`h-7 px-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors border flex items-center justify-center gap-1 cursor-pointer truncate ${filtro === 'no_inscriptos'
                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                : 'text-text-muted hover:text-text border-transparent'
                }`}
            >
              <span className="hidden sm:inline">No inscriptos</span>
              <span className="sm:hidden">Libres</span>
              <span className="opacity-80 tabular-nums">({totalLibres})</span>
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar club por nombre…"
              className="w-full h-8 pl-8 pr-7 rounded-xl border border-border bg-surface text-xs text-text outline-none focus:border-orange-500 transition-colors"
            />
            <IconSearch className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-0.5 text-xs cursor-pointer flex items-center justify-center"
                aria-label="Limpiar búsqueda"
              >
                <IconClose className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Clubes en Grid */}
        <div className="mt-3 flex-1 min-h-0 overflow-y-auto pr-0.5">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Spinner label="Cargando clubes y estado de inscripción…" />
            </div>
          ) : equiposFiltrados.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-border bg-base text-text-muted text-xs">
              {busqueda
                ? 'No se encontraron clubes que coincidan con la búsqueda.'
                : 'No hay clubes en esta categoría de filtro.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {equiposFiltrados.map((eq) => {
                const tienePartidos = eq.partidos_jugados > 0
                const isProcessing = procesandoId === eq.id
                const enOtraCategoria = !eq.inscripto && Boolean(eq.otra_categoria)

                let cardClasses = 'border-border bg-base hover:border-orange-500/50 hover:bg-surface cursor-pointer'
                let cardTitle = 'Hacé clic para inscribir en el torneo'

                if (tienePartidos) {
                  cardClasses = 'border-emerald-500/50 bg-emerald-500/10 cursor-not-allowed opacity-90'
                  cardTitle = 'No se puede quitar: ya tiene partidos jugados en este torneo'
                } else if (eq.inscripto) {
                  cardClasses = 'border-emerald-500/50 bg-emerald-500/10 hover:border-rose-500/60 hover:bg-rose-500/10 cursor-pointer group'
                  cardTitle = 'Hacé clic para quitar del torneo'
                } else if (enOtraCategoria) {
                  cardClasses = 'border-amber-500/35 bg-amber-500/5 dark:bg-amber-500/10 hover:border-amber-500/50 cursor-not-allowed opacity-80'
                  cardTitle = `Inscripto en ${eq.otra_categoria} (${torneo.temporada}). Primero debés darlo de baja en esa categoría.`
                }

                return (
                  <div
                    key={eq.id}
                    onClick={() => {
                      if (!isProcessing) handleToggleEquipo(eq)
                    }}
                    title={cardTitle}
                    className={`relative p-3 rounded-xl border flex items-center gap-3 transition-colors select-none ${cardClasses}`}
                  >
                    {/* Escudo del club */}
                    <div className="shrink-0">
                      <EscudoEquipo
                        url={eq.escudo_url}
                        nombre={eq.nombre}
                        className="w-10 h-10 rounded-full"
                      />
                    </div>

                    {/* Info del club */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-text truncate uppercase font-display">
                        {eq.nombre}
                      </p>

                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {eq.inscripto ? (
                          <>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <IconCheck className="w-3 h-3 text-emerald-400" />
                              <span>Inscripto</span>
                            </span>
                            {tienePartidos ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface text-text-muted border border-border">
                                {eq.partidos_jugados} {eq.partidos_jugados === 1 ? 'partido' : 'partidos'}
                              </span>
                            ) : (
                              <span className="hidden group-hover:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-rose-500">
                                Quitar
                              </span>
                            )}
                          </>
                        ) : enOtraCategoria ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            En {eq.otra_categoria}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface text-text-muted border border-border">
                            + Inscribir
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Indicador de carga */}
                    {isProcessing && (
                      <div className="absolute inset-0 bg-surface/80 rounded-xl flex items-center justify-center">
                        <span className="text-[11px] font-bold text-orange-500">
                          Actualizando…
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div data-ui="modal-footer" className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-text-muted hidden sm:block">
            Hacé clic en cualquier club para sumarlo o quitarlo del torneo.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto h-9 px-5 rounded-xl border border-border bg-base hover:bg-page active:scale-95 text-text font-bold text-xs uppercase transition-colors cursor-pointer ml-auto"
          >
            Listo
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
