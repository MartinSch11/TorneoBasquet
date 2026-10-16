import { useEffect, useState, useCallback, useMemo } from 'react'
import api from '../../services/api'
import Spinner from '../ui/Spinner'
import { useToast } from '../../context/ToastContext'
import { formatFecha, formatHorario } from '../../utils/formatFecha'
import PlanillaPartidoModal from './PlanillaPartidoModal'
import ModalEditarPartido from './ModalEditarPartido'
import ModalProgramarPartido from './ModalProgramarPartido'

export default function GestionPartidos({ initialTorneoId, onTorneoChange }) {
  const { toast } = useToast()
  const [torneos, setTorneos] = useState([])
  const [torneoId, setTorneoId] = useState(initialTorneoId || '')
  const [filtroEstado, setFiltroEstado] = useState('todos') // 'todos' | 'pendientes' | 'jugados'
  const [busqueda, setBusqueda] = useState('')
  const [partidosPendientes, setPartidosPendientes] = useState([])
  const [partidosJugados, setPartidosJugados] = useState([])
  const [canchas, setCanchas] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal para programar un nuevo partido
  const [modalProgramarAbierto, setModalProgramarAbierto] = useState(false)
  // Partido seleccionado para abrir el acta / planilla
  const [partidoSeleccionado, setPartidoSeleccionado] = useState(null)
  // Partido seleccionado para editar metadatos (fecha, hora, cancha)
  const [partidoAEditar, setPartidoAEditar] = useState(null)

  // 1. Cargar lista de torneos y canchas
  useEffect(() => {
    async function cargarInicial() {
      try {
        const [resTorneos, resCanchas] = await Promise.all([
          api.get('/torneos'),
          api.get('/canchas').catch(() => ({ data: [] })),
        ])
        setTorneos(resTorneos.data)
        setCanchas(resCanchas.data || [])
        if (resTorneos.data.length > 0) {
          const encontrado = initialTorneoId && resTorneos.data.find((t) => t.id === Number(initialTorneoId))
          const target = encontrado || resTorneos.data.find((t) => t.estado === 'activo') || resTorneos.data[0]
          setTorneoId(target.id)
          onTorneoChange?.(target.id)
        }
      } catch (err) {
        toast.error('Error al cargar la lista de torneos')
      }
    }
    cargarInicial()
  }, [initialTorneoId, onTorneoChange, toast])

  // 2. Cargar partidos según torneo
  const cargarPartidos = useCallback(async () => {
    if (!torneoId) return
    try {
      setLoading(true)
      const [resPend, resJug] = await Promise.all([
        api.get(`/torneos/${torneoId}/proximos-partidos`),
        api.get(`/torneos/${torneoId}/resultados?limit=100`),
      ])

      setPartidosPendientes(resPend.data)
      setPartidosJugados(resJug.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al cargar los partidos')
    } finally {
      setLoading(false)
    }
  }, [torneoId, toast])

  useEffect(() => {
    cargarPartidos()
  }, [cargarPartidos])

  // Lista combinada y filtrada
  const partidosFiltrados = useMemo(() => {
    let lista = []
    if (filtroEstado === 'todos') {
      lista = [
        ...partidosPendientes.map((p) => ({ ...p, jugado: false })),
        ...partidosJugados.map((p) => ({ ...p, jugado: true })),
      ]
    } else if (filtroEstado === 'pendientes') {
      lista = partidosPendientes.map((p) => ({ ...p, jugado: false }))
    } else {
      lista = partidosJugados.map((p) => ({ ...p, jugado: true }))
    }

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim()
      lista = lista.filter(
        (p) =>
          (p.equipo_local || '').toLowerCase().includes(q) ||
          (p.equipo_visitante || '').toLowerCase().includes(q) ||
          (p.cancha && p.cancha.toLowerCase().includes(q))
      )
    }

    return lista
  }, [partidosPendientes, partidosJugados, filtroEstado, busqueda])

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Control Superior */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold uppercase tracking-wider text-text">
            Planillas y Partidos
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Cargá resultados, planillas oficiales con estadísticas individuales y actas digitales de juego.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalProgramarAbierto(true)}
          className="h-9 px-4 rounded-xl border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 font-display font-bold text-xs uppercase active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
        >
          <span className="text-sm font-bold leading-none">+</span>
          <span>Programar Partido</span>
        </button>
      </div>

      {/* Filtros de Torneo, Estado y Búsqueda */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Selector de Torneo */}
          <div className="flex items-center gap-2 bg-surface px-3 py-1 rounded-xl border border-border">
            <label className="font-display font-bold text-text-muted uppercase text-xs shrink-0">Torneo:</label>
            <select
              value={torneoId}
              onChange={(e) => {
                setTorneoId(e.target.value)
                onTorneoChange?.(e.target.value)
              }}
              className="h-8 px-2 w-full sm:w-auto rounded-lg border border-transparent bg-transparent text-xs font-semibold text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors cursor-pointer"
            >
              {torneos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} {t.temporada} ({t.categoria})
                </option>
              ))}
            </select>
          </div>

          {/* Filtros de Estado */}
          <div className="flex w-full sm:w-auto overflow-x-auto rounded-xl border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setFiltroEstado('todos')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors border text-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                filtroEstado === 'todos'
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                  : 'text-text-muted hover:text-text border-transparent'
              }`}
            >
              <span>Todos</span>
              <span className="opacity-80">({partidosPendientes.length + partidosJugados.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstado('pendientes')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors border text-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                filtroEstado === 'pendientes'
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                  : 'text-text-muted hover:text-text border-transparent'
              }`}
            >
              <span>Pendientes</span>
              <span className="opacity-80">({partidosPendientes.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstado('jugados')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors border text-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                filtroEstado === 'jugados'
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                  : 'text-text-muted hover:text-text border-transparent'
              }`}
            >
              <span>Jugados</span>
              <span className="opacity-80">({partidosJugados.length})</span>
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar por equipo o cancha…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-9 px-3 w-full sm:w-64 rounded-xl border border-border bg-surface text-xs text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="text-xs text-text-muted hover:text-text px-2 py-1 shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500 rounded"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Partidos */}
      {loading ? (
        <div className="p-8">
          <Spinner label="Cargando partidos…" />
        </div>
      ) : partidosFiltrados.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-border bg-surface text-text-muted text-xs">
          No se encontraron partidos con el filtro actual.
        </div>
      ) : (
        <div data-ui="admin-table" className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead data-ui="table-head" className="border-b border-border/80 bg-surface/80 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="py-3 px-3 w-16">Fecha</th>
                  <th className="py-3 px-3 w-28">Fase</th>
                  <th className="py-3 px-3 text-right">Local</th>
                  <th className="py-3 px-3 text-center w-24">Resultado</th>
                  <th className="py-3 px-3">Visitante</th>
                  <th className="py-3 px-3 w-40">Cancha / Horario</th>
                  <th className="py-3 px-3 w-24 text-center">Estado</th>
                  <th className="py-3 px-4 w-28 text-right">Planilla</th>
                </tr>
              </thead>
              <tbody data-ui="table-body" className="divide-y divide-border/40 text-[11px]">
                {partidosFiltrados.map((p) => {
                  const jugado = p.jugado
                  const localGano = jugado && p.pts_local > p.pts_visitante
                  const visitGano = jugado && p.pts_visitante > p.pts_local

                  return (
                    <tr key={p.id} className="hover:bg-page/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-orange-500">
                        F{p.numero_fecha || 1}
                      </td>

                      <td className="py-3 px-3 text-text-muted truncate max-w-[100px]">
                        {p.fase}
                      </td>

                      {/* Local */}
                      <td className="py-3 px-3 text-right font-semibold">
                        <span className={localGano ? 'text-orange-500 font-bold' : 'text-text'}>
                          {p.equipo_local}
                        </span>
                      </td>

                      {/* Tanteador central */}
                      <td className="py-3 px-3 text-center font-bold">
                        {jugado ? (
                          <span className="px-2 py-0.5 rounded bg-base text-orange-500 font-bold tabular-nums">
                            {p.pts_local} - {p.pts_visitante}
                          </span>
                        ) : (
                          <span className="text-text-muted text-xs">vs</span>
                        )}
                      </td>

                      {/* Visitante */}
                      <td className="py-3 px-3 font-semibold">
                        <span className={visitGano ? 'text-orange-500 font-bold' : 'text-text'}>
                          {p.equipo_visitante}
                        </span>
                      </td>

                      {/* Cancha / Horario */}
                      <td className="py-3 px-3 text-text-muted text-[10px] truncate max-w-[150px]">
                        <div>{formatFecha(p.fecha)} {p.horario && `· ${formatHorario(p.horario)}`}</div>
                        {p.cancha && <div className="text-text/80 font-medium truncate">{p.cancha}</div>}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-3 text-center">
                        {jugado ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold text-[10px] uppercase border border-emerald-500/30">
                            Finalizado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-neutral-500/15 text-neutral-400 font-bold text-[10px] uppercase border border-neutral-500/30">
                            Pendiente
                          </span>
                        )}
                      </td>

                      {/* Botones de Acción */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPartidoAEditar(p)}
                            title="Editar fecha, horario, sede o fase"
                            className="h-7 px-2 rounded-lg border border-border bg-surface text-xs font-semibold text-text-muted hover:border-orange-500/50 hover:text-orange-500 transition-colors inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
                          >
                            Datos
                          </button>
                          <button
                            type="button"
                            onClick={() => setPartidoSeleccionado(p)}
                            className={
                              jugado
                                ? 'h-7 px-2.5 rounded-lg border border-border bg-surface text-xs font-semibold text-text hover:border-orange-500/50 hover:text-orange-500 transition-colors inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500'
                                : 'h-7 px-2.5 rounded-lg border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 font-display font-bold text-xs uppercase active:scale-95 transition-colors inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500'
                            }
                          >
                            {jugado ? 'Planilla' : 'Cargar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Edición de Metadatos del Partido (Día, Hora, Sede, Eliminar) */}
      {partidoAEditar && (
        <ModalEditarPartido
          isOpen={Boolean(partidoAEditar)}
          onClose={() => setPartidoAEditar(null)}
          partido={partidoAEditar}
          canchas={canchas}
          onPartidoActualizado={() => {
            toast.success('Partido actualizado correctamente.')
            cargarPartidos()
          }}
          onPartidoEliminado={() => {
            toast.success('Partido eliminado del fixture.')
            cargarPartidos()
          }}
        />
      )}

      {/* Modal de Planilla de Juego Oficial */}
      {partidoSeleccionado && (
        <PlanillaPartidoModal
          partido={partidoSeleccionado}
          onClose={() => setPartidoSeleccionado(null)}
          onSaved={() => {
            toast.success('Planilla oficial guardada. Posiciones y goleadores actualizados.')
            cargarPartidos()
          }}
        />
      )}

      {/* Modal para Programar Nuevo Partido */}
      <ModalProgramarPartido
        isOpen={modalProgramarAbierto}
        onClose={() => setModalProgramarAbierto(false)}
        initialTorneoId={torneoId}
        onPartidoCreado={(tId) => {
          if (tId && String(tId) !== String(torneoId)) {
            setTorneoId(String(tId))
            onTorneoChange?.(String(tId))
          }
          toast.success('Partido programado exitosamente.')
          cargarPartidos()
        }}
      />
    </div>
  )
}
