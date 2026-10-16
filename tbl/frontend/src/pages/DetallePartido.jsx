import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import Spinner from '../components/ui/Spinner'
import EscudoEquipo from '../components/ui/EscudoEquipo'
import { formatFecha, formatHorario } from '../utils/formatFecha'

function formatFase(fase) {
  if (!fase) return 'Fase Regular'
  const f = fase.toUpperCase()
  if (f.includes('PROMOCION') || f.includes('DESCENSO')) return 'PROMOCIÓN'
  return fase
}

export default function DetallePartido() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [partido, setPartido] = useState(null)
  const [equipoActivo, setEquipoActivo] = useState('local')
  const [jugadoresLocal, setJugadoresLocal] = useState([])
  const [jugadoresVisitante, setJugadoresVisitante] = useState([])
  const [stats, setStats] = useState({})

  useEffect(() => {
    let cancelado = false

    async function cargarDetalle() {
      try {
        setLoading(true)
        setError('')

        const [resPartido, resStats] = await Promise.all([
          api.get(`/partidos/${id}`),
          api.get(`/partidos/${id}/estadisticas`),
        ])

        const pData = resPartido.data
        const stData = resStats.data || []

        const [resLocal, resVisit] = await Promise.all([
          pData.equipo_local_id
            ? api.get(`/equipos/${pData.equipo_local_id}`).catch(() => ({ data: { jugadores: [] } }))
            : Promise.resolve({ data: { jugadores: [] } }),
          pData.equipo_visitante_id
            ? api.get(`/equipos/${pData.equipo_visitante_id}`).catch(() => ({ data: { jugadores: [] } }))
            : Promise.resolve({ data: { jugadores: [] } }),
        ])

        if (cancelado) return

        const mapaStats = {}
        for (const st of stData) {
          const triples = st.triples_conv || 0
          const dobles = st.dobles_conv || 0
          const libres = st.libres_conv || 0
          const puntos = st.puntos ?? libres * 1 + dobles * 2 + triples * 3

          mapaStats[st.jugador_id] = {
            libres,
            dobles,
            triples,
            puntos,
            rebotes: (st.reb_defensivos || 0) + (st.reb_ofensivos || 0),
            asistencias: st.asistencias || 0,
            robos: st.recuperos || 0,
            bloqueos: st.bloqueos || 0,
            perdidas: st.perdidas || 0,
            faltas: st.faltas_personales || 0,
            jugador_nombre: st.jugador_nombre,
            numero: st.numero,
            equipo_id: st.equipo_id,
          }
        }

        // Combinar plantel actual con cualquier jugador que tenga estadísticas registradas en el partido
        const combinarPlantel = (plantelBase, equipoId) => {
          const mapaJugadores = new Map()
          for (const j of plantelBase) {
            mapaJugadores.set(j.id, {
              id: j.id,
              nombre: j.nombre,
              numero: j.numero,
            })
          }
          for (const st of stData) {
            if (String(st.equipo_id) === String(equipoId) && !mapaJugadores.has(st.jugador_id)) {
              mapaJugadores.set(st.jugador_id, {
                id: st.jugador_id,
                nombre: st.jugador_nombre,
                numero: st.numero,
              })
            }
          }
          const lista = Array.from(mapaJugadores.values())
          lista.sort((a, b) => {
            const ptsA = mapaStats[a.id]?.puntos || 0
            const ptsB = mapaStats[b.id]?.puntos || 0
            if (ptsB !== ptsA) return ptsB - ptsA
            return (a.numero ?? 999) - (b.numero ?? 999)
          })
          return lista
        }

        setPartido(pData)
        setStats(mapaStats)
        setJugadoresLocal(combinarPlantel(resLocal.data?.jugadores || [], pData.equipo_local_id))
        setJugadoresVisitante(combinarPlantel(resVisit.data?.jugadores || [], pData.equipo_visitante_id))
      } catch (err) {
        if (!cancelado) {
          setError(err.response?.data?.detail || 'No se pudo cargar la planilla del partido.')
        }
      } finally {
        if (!cancelado) setLoading(false)
      }
    }

    cargarDetalle()
    return () => {
      cancelado = true
    }
  }, [id])

  const sumaLocal = useMemo(
    () => jugadoresLocal.reduce((acc, j) => acc + (stats[j.id]?.puntos || 0), 0),
    [jugadoresLocal, stats],
  )

  const sumaVisitante = useMemo(
    () => jugadoresVisitante.reduce((acc, j) => acc + (stats[j.id]?.puntos || 0), 0),
    [jugadoresVisitante, stats],
  )

  const progresLocal = useMemo(
    () =>
      jugadoresLocal.filter((j) => {
        const s = stats[j.id]
        return s && (s.puntos > 0 || s.rebotes > 0 || s.asistencias > 0 || s.robos > 0 || s.bloqueos > 0 || s.perdidas > 0 || s.faltas > 0)
      }).length,
    [jugadoresLocal, stats],
  )

  const progresVisitante = useMemo(
    () =>
      jugadoresVisitante.filter((j) => {
        const s = stats[j.id]
        return s && (s.puntos > 0 || s.rebotes > 0 || s.asistencias > 0 || s.robos > 0 || s.bloqueos > 0 || s.perdidas > 0 || s.faltas > 0)
      }).length,
    [jugadoresVisitante, stats],
  )

  const esEquipoLocal = equipoActivo === 'local'
  const jugadoresActuales = esEquipoLocal ? jugadoresLocal : jugadoresVisitante
  const equipoNombreActual = partido ? (esEquipoLocal ? partido.equipo_local : partido.equipo_visitante) : ''
  const equipoIdActual = partido ? (esEquipoLocal ? partido.equipo_local_id : partido.equipo_visitante_id) : null

  const totalesEquipo = useMemo(() => {
    const res = { p1: 0, p2: 0, p3: 0, pts: 0, reb: 0, ast: 0, rob: 0, blq: 0, per: 0, fal: 0 }
    for (const j of jugadoresActuales) {
      const s = stats[j.id] || {}
      res.p1 += s.libres || 0
      res.p2 += s.dobles || 0
      res.p3 += s.triples || 0
      res.pts += s.puntos || 0
      res.reb += s.rebotes || 0
      res.ast += s.asistencias || 0
      res.rob += s.robos || 0
      res.blq += s.bloqueos || 0
      res.per += s.perdidas || 0
      res.fal += s.faltas || 0
    }
    return res
  }, [jugadoresActuales, stats])

  const maximoAnotador = useMemo(() => {
    let mejor = null
    const todos = [
      ...jugadoresLocal.map((j) => ({ ...j, equipo: partido?.equipo_local })),
      ...jugadoresVisitante.map((j) => ({ ...j, equipo: partido?.equipo_visitante })),
    ]
    for (const j of todos) {
      const pts = stats[j.id]?.puntos || 0
      if (pts > 0 && (!mejor || pts > mejor.puntos)) {
        mejor = { ...j, puntos: pts, triples: stats[j.id]?.triples || 0 }
      }
    }
    return mejor
  }, [jugadoresLocal, jugadoresVisitante, stats, partido])

  if (loading) return <Spinner label="Cargando planilla del partido…" />
  if (error) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8">
        <Link
          to="/resultados"
          className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-text-muted hover:text-orange-500 transition-colors"
        >
          ‹ Volver a resultados
        </Link>
        <p className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      </section>
    )
  }
  if (!partido) return null

  const ptsLocal = partido.pts_local ?? sumaLocal
  const ptsVisitante = partido.pts_visitante ?? sumaVisitante
  const yaJugado =
    Boolean(partido.jugado) ||
    (partido.pts_local !== null && partido.pts_visitante !== null && (partido.pts_local > 0 || partido.pts_visitante > 0))
  const localGano = yaJugado && ptsLocal > ptsVisitante
  const visitGano = yaJugado && ptsVisitante > ptsLocal
  const tienePlanillaCargada = sumaLocal > 0 || sumaVisitante > 0 || progresLocal > 0 || progresVisitante > 0

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 flex flex-col gap-4">
      {/* Navegación superior */}
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/resultados"
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-text-muted hover:text-orange-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-md shrink-0"
        >
          <span>‹</span>
          <span className="sm:hidden">Volver</span>
          <span className="hidden sm:inline">Volver a resultados</span>
        </Link>

        {equipoIdActual && (
          <Link
            to={`/equipos/${equipoIdActual}`}
            className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded px-1 text-right truncate max-w-[210px] sm:max-w-none shrink-0"
            title={`Ver plantel de ${equipoNombreActual}`}
          >
            Ver plantel de {equipoNombreActual} ›
          </Link>
        )}
      </div>

      {/* Cabecera de Planilla Oficial */}
      <div data-ui="card" className="rounded-2xl border border-border bg-surface p-4 sm:p-5 flex flex-col gap-3">
        <div data-ui="card-header" className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg sm:text-xl font-bold uppercase tracking-wider text-text">
                Planilla Oficial de Partido
              </h1>
              {yaJugado ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Finalizado
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Programado
                </span>
              )}
            </div>
            {partido.categoria && (
              <p className="text-xs text-text-muted mt-0.5">
                {partido.torneo_nombre ? `${partido.torneo_nombre} · ` : ''}
                {partido.categoria} · {formatFase(partido.fase)}
              </p>
            )}
          </div>

          {/* Metadatos del encuentro */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted tabular-nums">
            {partido.numero_fecha && (
              <span className="font-bold text-orange-500 uppercase tracking-wide">
                FECHA {partido.numero_fecha}
              </span>
            )}
            {partido.fecha && (
              <>
                <span className="text-border select-none">·</span>
                <span>
                  {formatFecha(partido.fecha)}
                  {partido.horario && ` · ${formatHorario(partido.horario)} hs`}
                </span>
              </>
            )}
            {partido.cancha && (
              <>
                <span className="text-border select-none">·</span>
                <span className="font-medium text-text">{partido.cancha}</span>
              </>
            )}
          </div>
        </div>

        {/* Selector de equipos con Marcador Oficial y Puntos de planilla integrados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          {/* Tarjeta Equipo Local */}
          <button
            type="button"
            onClick={() => setEquipoActivo('local')}
            className={`cursor-pointer p-3 rounded-xl border transition-colors flex items-center justify-between text-left select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              equipoActivo === 'local'
                ? 'border-orange-500/60 bg-orange-500/10 ring-1 ring-orange-500/30'
                : 'border-border bg-page/70 hover:bg-page hover:border-orange-500/30 text-text-muted'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <EscudoEquipo
                url={partido.escudo_local}
                nombre={partido.equipo_local}
                className="w-10 h-10 shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      equipoActivo === 'local'
                        ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                        : 'bg-surface text-text-muted border border-border'
                    }`}
                  >
                    Local
                  </span>
                  <span className="font-display font-bold text-sm sm:text-base text-text truncate">
                    {partido.equipo_local}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-text-muted mt-0.5 whitespace-nowrap">
                  <span>Planilla:</span>
                  <strong className="tabular-nums text-text">{sumaLocal} pts</strong>
                  {jugadoresLocal.length > 0 && (
                    <span className="text-text-muted/80 whitespace-nowrap">
                      ({progresLocal}/{jugadoresLocal.length} jug.)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Casillero de Marcador Oficial */}
            <div className="shrink-0 ml-2">
              <div data-ui="marcador-box" className="flex flex-col items-center justify-center bg-page border border-border px-2.5 py-1 sm:py-1.5 rounded-lg min-w-[58px] text-center">
                <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-text-muted leading-tight">
                  Marcador
                </span>
                <span
                  className={`font-athletic text-xl sm:text-2xl font-extrabold tabular-nums leading-none mt-0.5 ${
                    localGano ? 'text-orange-600 dark:text-orange-400' : 'text-text'
                  }`}
                >
                  {yaJugado ? ptsLocal : '-'}
                </span>
              </div>
            </div>
          </button>

          {/* Tarjeta Equipo Visitante */}
          <button
            type="button"
            onClick={() => setEquipoActivo('visitante')}
            className={`cursor-pointer p-3 rounded-xl border transition-colors flex items-center justify-between text-left select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              equipoActivo === 'visitante'
                ? 'border-orange-500/60 bg-orange-500/10 ring-1 ring-orange-500/30'
                : 'border-border bg-page/70 hover:bg-page hover:border-orange-500/30 text-text-muted'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <EscudoEquipo
                url={partido.escudo_visitante}
                nombre={partido.equipo_visitante}
                className="w-10 h-10 shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      equipoActivo === 'visitante'
                        ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                        : 'bg-surface text-text-muted border border-border'
                    }`}
                  >
                    Visitante
                  </span>
                  <span className="font-display font-bold text-sm sm:text-base text-text truncate">
                    {partido.equipo_visitante}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-text-muted mt-0.5 whitespace-nowrap">
                  <span>Planilla:</span>
                  <strong className="tabular-nums text-text">{sumaVisitante} pts</strong>
                  {jugadoresVisitante.length > 0 && (
                    <span className="text-text-muted/80 whitespace-nowrap">
                      ({progresVisitante}/{jugadoresVisitante.length} jug.)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Casillero de Marcador Oficial */}
            <div className="shrink-0 ml-2">
              <div data-ui="marcador-box" className="flex flex-col items-center justify-center bg-page border border-border px-2.5 py-1 sm:py-1.5 rounded-lg min-w-[58px] text-center">
                <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-text-muted leading-tight">
                  Marcador
                </span>
                <span
                  className={`font-athletic text-xl sm:text-2xl font-extrabold tabular-nums leading-none mt-0.5 ${
                    visitGano ? 'text-orange-600 dark:text-orange-400' : 'text-text'
                  }`}
                >
                  {yaJugado ? ptsVisitante : '-'}
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Destacado del partido / aviso de marcador global */}
        {maximoAnotador ? (
          <div
            data-ui="highlight-banner"
            className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-orange-500/30 bg-orange-500/10"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
              <div className="min-w-0">
                <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Máximo anotador del partido
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-text truncate">
                    {maximoAnotador.nombre}
                    {maximoAnotador.numero !== null && maximoAnotador.numero !== undefined
                      ? ` (#${maximoAnotador.numero})`
                      : ''}
                  </span>
                  <span className="text-[11px] sm:text-xs text-text-muted whitespace-nowrap shrink-0">
                    · {maximoAnotador.equipo}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="font-athletic font-extrabold text-base sm:text-lg text-orange-600 dark:text-orange-400 tabular-nums leading-none">
                {maximoAnotador.puntos} <span className="text-xs font-display">PTS</span>
              </div>
              {maximoAnotador.triples > 0 && (
                <div className="text-[10px] sm:text-[11px] text-text-muted tabular-nums mt-0.5 whitespace-nowrap">
                  {maximoAnotador.triples} {maximoAnotador.triples === 1 ? 'triple' : 'triples'}
                </div>
              )}
            </div>
          </div>
        ) : yaJugado && !tienePlanillaCargada ? (
          <div data-ui="info-banner" className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-page text-xs text-text-muted">
            <span className="w-2 h-2 rounded-full bg-border shrink-0" />
            <span>
              Este partido registra el marcador final oficial ({partido.equipo_local} {ptsLocal} -{' '}
              {ptsVisitante} {partido.equipo_visitante}) sin desglose individual cargado en planilla.
            </span>
          </div>
        ) : null}

        {/* TABLA DE JUGADORES (Box Score de solo lectura) */}
        <div data-ui="admin-table" className="border border-border rounded-xl bg-page overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse tabular-nums text-xs">
              <thead data-ui="table-head" className="bg-surface border-b border-border text-[10px] font-bold uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="py-2.5 px-2 w-12 text-center font-bold text-text-muted">#</th>
                  <th className="py-2.5 px-3 font-sans min-w-[160px] font-bold text-text-muted">
                    Jugador ({equipoNombreActual})
                  </th>
                  <th
                    className="py-2.5 px-1.5 w-12 text-center font-bold text-text bg-orange-500/5"
                    title="Tiros libres convertidos (1 pt c/u)"
                  >
                    1P
                  </th>
                  <th
                    className="py-2.5 px-1.5 w-12 text-center font-bold text-text bg-orange-500/5"
                    title="Dobles convertidos (2 pts c/u)"
                  >
                    2P
                  </th>
                  <th
                    className="py-2.5 px-1.5 w-12 text-center font-bold text-text bg-orange-500/5"
                    title="Triples convertidos (3 pts c/u)"
                  >
                    3P
                  </th>
                  <th
                    className="py-2.5 px-2 w-16 text-center text-orange-600 dark:text-orange-400 bg-orange-500/15 font-black"
                    title="Puntos totales = 1P + (2P * 2) + (3P * 3)"
                  >
                    PTS
                  </th>
                  <th className="py-2.5 px-1.5 w-12 text-center text-text-muted" title="Rebotes totales">
                    REB
                  </th>
                  <th className="py-2.5 px-1.5 w-12 text-center text-text-muted" title="Asistencias">
                    AST
                  </th>
                  <th className="py-2.5 px-1.5 w-12 text-center text-text-muted" title="Robos / Recuperos">
                    ROB
                  </th>
                  <th className="py-2.5 px-1.5 w-12 text-center text-text-muted" title="Tapones / Bloqueos">
                    TAP
                  </th>
                  <th className="py-2.5 px-1.5 w-12 text-center text-text-muted" title="Pérdidas">
                    PER
                  </th>
                  <th
                    className="py-2.5 px-1.5 w-12 text-center text-text-muted"
                    title="Faltas personales (0 a 5)"
                  >
                    FAL
                  </th>
                </tr>
              </thead>
              <tbody data-ui="table-body" className="divide-y divide-border/40">
                {jugadoresActuales.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="py-8 text-center text-text-muted font-sans italic">
                      No hay jugadores registrados en el plantel de {equipoNombreActual}.
                    </td>
                  </tr>
                ) : (
                  jugadoresActuales.map((j) => {
                    const s = stats[j.id] || {}
                    const pts = s.puntos || 0
                    const libres = s.libres || 0
                    const dobles = s.dobles || 0
                    const triples = s.triples || 0
                    const rebotes = s.rebotes || 0
                    const asistencias = s.asistencias || 0
                    const robos = s.robos || 0
                    const bloqueos = s.bloqueos || 0
                    const perdidas = s.perdidas || 0
                    const faltas = s.faltas || 0

                    return (
                      <tr key={j.id} className="hover:bg-surface/60 transition-colors">
                        <td className="py-2 px-2 text-center tabular-nums text-xs font-semibold text-text-muted">
                          {j.numero !== null && j.numero !== undefined ? j.numero : '-'}
                        </td>
                        <td className="py-2 px-3 font-sans font-semibold text-text truncate max-w-[200px]">
                          {j.nombre}
                        </td>

                        {/* 1P */}
                        <td className="py-2 px-1.5 text-center bg-orange-500/5 font-semibold text-text">
                          {libres > 0 ? libres : <span className="text-text-muted/40">0</span>}
                        </td>

                        {/* 2P */}
                        <td className="py-2 px-1.5 text-center bg-orange-500/5 font-semibold text-text">
                          {dobles > 0 ? dobles : <span className="text-text-muted/40">0</span>}
                        </td>

                        {/* 3P */}
                        <td className="py-2 px-1.5 text-center bg-orange-500/5 font-semibold text-text">
                          {triples > 0 ? triples : <span className="text-text-muted/40">0</span>}
                        </td>

                        {/* PTS */}
                        <td className="py-2 px-2 text-center bg-orange-500/15 tabular-nums font-black text-xs text-orange-600 dark:text-orange-400">
                          {pts}
                        </td>

                        {/* REB */}
                        <td className="py-2 px-1.5 text-center font-medium text-text">
                          {rebotes > 0 ? rebotes : <span className="text-text-muted/40">0</span>}
                        </td>

                        {/* AST */}
                        <td className="py-2 px-1.5 text-center font-medium text-text">
                          {asistencias > 0 ? asistencias : <span className="text-text-muted/40">0</span>}
                        </td>

                        {/* ROB */}
                        <td className="py-2 px-1.5 text-center font-medium text-text">
                          {robos > 0 ? robos : <span className="text-text-muted/40">0</span>}
                        </td>

                        {/* TAP */}
                        <td className="py-2 px-1.5 text-center font-medium text-text">
                          {bloqueos > 0 ? bloqueos : <span className="text-text-muted/40">0</span>}
                        </td>

                        {/* PER */}
                        <td className="py-2 px-1.5 text-center font-medium text-rose-500">
                          {perdidas > 0 ? perdidas : <span className="text-text-muted/40">0</span>}
                        </td>

                        {/* FAL */}
                        <td className="py-2 px-1.5 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-6 rounded text-xs font-bold tabular-nums ${
                              faltas >= 5
                                ? 'border border-rose-500/80 bg-rose-500/15 text-rose-500'
                                : faltas >= 4
                                  ? 'border border-amber-500/60 bg-amber-500/10 text-amber-500'
                                  : faltas > 0
                                    ? 'text-text'
                                    : 'text-text-muted/40 font-normal'
                            }`}
                          >
                            {faltas}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>

              {/* FILA DE TOTALES DEL EQUIPO */}
              <tfoot
                data-ui="table-foot"
                className="bg-surface border-t-2 border-border font-bold text-xs text-text-muted"
              >
                <tr>
                  <td
                    colSpan="2"
                    className="py-2.5 px-3 text-right font-display uppercase tracking-wider text-text"
                  >
                    Totales de {equipoNombreActual}:
                  </td>
                  <td className="py-2.5 px-1.5 text-center text-text font-bold bg-orange-500/5">
                    {totalesEquipo.p1}
                  </td>
                  <td className="py-2.5 px-1.5 text-center text-text font-bold bg-orange-500/5">
                    {totalesEquipo.p2}
                  </td>
                  <td className="py-2.5 px-1.5 text-center text-text font-bold bg-orange-500/5">
                    {totalesEquipo.p3}
                  </td>
                  <td className="py-2.5 px-2 text-center text-orange-600 dark:text-orange-400 font-black bg-orange-500/15 text-xs">
                    {totalesEquipo.pts}
                  </td>
                  <td className="py-2.5 px-1.5 text-center">{totalesEquipo.reb}</td>
                  <td className="py-2.5 px-1.5 text-center">{totalesEquipo.ast}</td>
                  <td className="py-2.5 px-1.5 text-center text-text font-bold">{totalesEquipo.rob}</td>
                  <td className="py-2.5 px-1.5 text-center">{totalesEquipo.blq}</td>
                  <td className="py-2.5 px-1.5 text-center">{totalesEquipo.per}</td>
                  <td className="py-2.5 px-1.5 text-center text-orange-600 dark:text-orange-400 font-bold">
                    {totalesEquipo.fal}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
