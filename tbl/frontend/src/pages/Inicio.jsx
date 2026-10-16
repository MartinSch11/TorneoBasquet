import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { useTorneo } from '../hooks/useTorneo'
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

function TickerItemFiba({ partido }) {
  const ptsLocal = partido.pts_local ?? 0
  const ptsVisita = partido.pts_visitante ?? 0
  const tienePuntos = partido.pts_local !== null && partido.pts_visitante !== null
  const jugado = Boolean(partido.jugado) || (tienePuntos && (ptsLocal > 0 || ptsVisita > 0))
  const localGano = jugado && ptsLocal > ptsVisita
  const visitGano = jugado && ptsVisita > ptsLocal
  const horaStr = partido.horario ? formatHorario(partido.horario) : null
  const fechaStr = formatFecha(partido.fecha)

  const Wrapper = jugado && partido.id ? Link : 'article'

  return (
    <Wrapper
      to={jugado && partido.id ? `/partidos/${partido.id}` : undefined}
      data-ui="match-card" className="shrink-0 w-52 sm:w-56 bg-page hover:bg-surface border border-border/80 hover:border-orange-500/60 rounded-lg px-2.5 py-1.5 transition-colors duration-150 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    >
      <div className="flex items-center justify-between text-xs text-text-muted mb-1 font-medium">
        <span className="truncate">{formatFase(partido.fase)}</span>
        {jugado ? (
          <span className="font-bold text-emerald-600 dark:text-emerald-400">FINAL</span>
        ) : (
          <span className="font-bold text-orange-600 dark:text-orange-400">
            {horaStr ? `${horaStr} hs` : fechaStr || 'Próx'}
          </span>
        )}
      </div>

      {/* Fila Local */}
      <div className="flex items-center justify-between gap-2 py-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <EscudoEquipo url={partido.escudo_local} nombre={partido.equipo_local} className="w-4 h-4 shrink-0" />
          <span className={`truncate text-xs ${localGano ? 'font-bold text-text' : 'font-medium text-text-muted'}`}>
            {partido.equipo_local}
          </span>
        </div>
        <span className={`font-athletic text-sm tabular-nums font-bold shrink-0 ${localGano ? 'text-orange-600 dark:text-orange-400' : 'text-text-muted'}`}>
          {jugado ? ptsLocal : '-'}
        </span>
      </div>

      {/* Fila Visitante */}
      <div className="flex items-center justify-between gap-2 py-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <EscudoEquipo url={partido.escudo_visitante} nombre={partido.equipo_visitante} className="w-4 h-4 shrink-0" />
          <span className={`truncate text-xs ${visitGano ? 'font-bold text-text' : 'font-medium text-text-muted'}`}>
            {partido.equipo_visitante}
          </span>
        </div>
        <span className={`font-athletic text-sm tabular-nums font-bold shrink-0 ${visitGano ? 'text-orange-600 dark:text-orange-400' : 'text-text-muted'}`}>
          {jugado ? ptsVisita : '-'}
        </span>
      </div>
    </Wrapper>
  )
}

function PartidoScorecard({ partido, jugado = true }) {
  const ptsLocal = partido.pts_local ?? 0
  const ptsVisita = partido.pts_visitante ?? 0
  const tienePuntos = partido.pts_local !== null && partido.pts_visitante !== null
  const localGano = jugado && tienePuntos && ptsLocal > ptsVisita
  const visitGano = jugado && tienePuntos && ptsVisita > ptsLocal
  const fechaStr = formatFecha(partido.fecha)
  const horaStr = partido.horario ? formatHorario(partido.horario) : null

  const Wrapper = jugado && partido.id ? Link : 'article'

  return (
    <Wrapper
      to={jugado && partido.id ? `/partidos/${partido.id}` : undefined}
      data-ui="match-card"
      className="group block rounded-xl border border-border bg-surface p-4 transition-colors duration-150 hover:border-orange-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    >
      <div className="flex items-center justify-between pb-2 text-sm font-medium text-text-muted">
        <span className="font-semibold text-text">{formatFase(partido.fase)}</span>
        <div className="flex items-center gap-1.5 tabular-nums text-sm">
          {fechaStr && <span>{fechaStr}</span>}
          {horaStr && <span className="font-semibold text-orange-600 dark:text-orange-400">· {horaStr} hs</span>}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
        {/* Local */}
        <div className="flex items-center gap-2.5 min-w-0">
          <EscudoEquipo url={partido.escudo_local} nombre={partido.equipo_local} className="w-10 h-10 shrink-0" />
          <div className="min-w-0">
            <span className="block text-xs font-semibold text-text-muted">Local</span>
            <span className={`block truncate text-sm sm:text-lg ${localGano ? 'font-bold text-text' : 'font-medium text-text-muted'}`}>
              {partido.equipo_local}
            </span>
          </div>
        </div>

        {/* Tablero central */}
        <div className="flex flex-col items-center justify-center px-2 shrink-0">
          {jugado && tienePuntos ? (
            <div className="flex items-center gap-2 font-athletic text-2xl sm:text-3xl font-bold tabular-nums">
              <span className={localGano ? 'text-orange-600 dark:text-orange-400' : 'text-text-muted'}>
                {ptsLocal}
              </span>
              <span className="text-text-muted font-light">-</span>
              <span className={visitGano ? 'text-orange-600 dark:text-orange-400' : 'text-text-muted'}>
                {ptsVisita}
              </span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded bg-orange-600/15 text-orange-600 dark:text-orange-400 font-athletic font-bold text-sm tracking-widest">
              VS
            </div>
          )}
        </div>

        {/* Visitante */}
        <div className="flex items-center justify-end gap-2.5 min-w-0 text-right">
          <div className="min-w-0">
            <span className="block text-xs font-semibold text-text-muted">Visita</span>
            <span className={`block truncate text-sm sm:text-lg ${visitGano ? 'font-bold text-text' : 'font-medium text-text-muted'}`}>
              {partido.equipo_visitante}
            </span>
          </div>
          <EscudoEquipo url={partido.escudo_visitante} nombre={partido.equipo_visitante} className="w-10 h-10 shrink-0" />
        </div>
      </div>

      {(partido.cancha || jugado) && (
        <div className="pt-2 text-xs text-text-muted flex items-center justify-between gap-2">
          <span className="truncate">{partido.cancha ? `Cancha: ${partido.cancha}` : 'Finalizado'}</span>
          {jugado && (
            <span className="font-bold text-orange-600 dark:text-orange-400 group-hover:underline shrink-0">
              Ver planilla ›
            </span>
          )}
        </div>
      )}
    </Wrapper>
  )
}

export default function InicioNuevo() {
  const [slideActivo, setSlideActivo] = useState(0)
  const [categoriaPosId, setCategoriaPosId] = useState(null)
  const { torneoSeleccionado, seleccionar } = useTorneo()

  const { data, loading, error } = useApi(async () => {
    const res = await api.get('/inicio')
    return res.data
  }, [])

  const {
    torneo_activo,
    etapa_actual = 'FASE REGULAR',
    fotos_destacadas = [],
    sponsors = [],
    ultimos_partidos = [],
    proximos_partidos = [],
    top_posiciones = [],
    posiciones_categorias = [],
    top_goleadores = [],
  } = data || {}

  const idCatActiva = categoriaPosId ?? torneoSeleccionado?.id ?? torneo_activo?.id
  const catPosActual =
    posiciones_categorias.find((c) => c.torneo.id === idCatActiva) ||
    posiciones_categorias[0] ||
    null
  const posicionesMostradas = catPosActual ? catPosActual.posiciones : top_posiciones

  const fotos = fotos_destacadas.length > 0 ? fotos_destacadas : []
  const fotoActual = fotos[slideActivo] || null
  const sponsorsActivos = (sponsors || []).filter((s) => s && s.activo !== false)
  const todosPartidos = [...ultimos_partidos, ...proximos_partidos]

  // Multiplicamos para que la cinta continua tenga suficiente recorrido sin cortes
  const repeticiones = Math.max(1, Math.ceil(6 / Math.max(1, todosPartidos.length)))
  const baseSet = Array(repeticiones).fill(todosPartidos).flat()
  const duracionMarquee = Math.max(32, baseSet.length * 4.5)

  if (loading) return <Spinner label="Cargando liga LBA…" />
  if (error)
    return <p className="mx-auto max-w-6xl px-4 py-10 text-center text-danger font-medium">{error}</p>

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Ticker deportivo continuo estilo FIBA / NBA Scoreboard */}
      {todosPartidos.length > 0 && (
        <section className="bg-surface py-2.5 overflow-hidden select-none" data-ui="scores-bar" aria-label="Marcadores de partidos">
          <div className="relative w-full overflow-hidden">
            <div
              className="animate-marquee flex items-center gap-3 py-0.5"
              style={{ animationDuration: `${duracionMarquee}s` }}
            >
              {baseSet.map((p, idx) => (
                <TickerItemFiba key={`a-${p.id}-${idx}`} partido={p} />
              ))}
              {baseSet.map((p, idx) => (
                <TickerItemFiba key={`b-${p.id}-${idx}`} partido={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Hero Principal Deportivo */}
      <header className="relative bg-black text-white overflow-hidden">
        {fotoActual ? (
          <div className="absolute inset-0 z-0">
            <img
              src={fotoActual.url}
              alt={fotoActual.titulo || 'Foto destacada'}
              fetchPriority="high"
              width="1920"
              height="1080"
              className="h-full w-full object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-black/50" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-slate-950 opacity-90" />
        )}

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:py-16 md:py-20">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold uppercase tracking-tight text-white leading-none text-balance">
              Liga de Básquetbol Amateur
            </h1>

            <p className="mt-4 text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-2xl text-pretty">
              Torneo oficial {torneo_activo?.categoria || 'Primera División'} temporada {torneo_activo?.temporada || '2026'}. Estadísticas de juego, fixture, resultados y tabla general.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/posiciones"
                className="h-11 px-6 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-display font-bold text-base uppercase tracking-wider transition-colors duration-150 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <span>Ver tabla de posiciones</span>
                <span>›</span>
              </Link>
              <Link
                to="/resultados"
                className="h-11 px-6 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 font-display font-semibold text-base uppercase tracking-wider transition-colors duration-150 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <span>Ver fixture y resultados</span>
              </Link>
            </div>

            {/* Etapa de la temporada */}
            <div className="mt-8 pt-4 flex items-center text-left">
              <div>
                <span className="block font-athletic text-2xl sm:text-3xl font-bold text-orange-400">
                  {formatFase(etapa_actual)}
                </span>
                <span className="block text-sm uppercase text-slate-400 font-medium">Etapa en juego</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selector de diapositivas en hero si hay fotos */}
        {fotos.length > 1 && (
          <nav aria-label="Fotos destacadas" className="relative z-10 mx-auto max-w-6xl px-4 pb-6 flex items-center gap-2">
            {fotos.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSlideActivo(idx)}
                className={`h-2 rounded transition-colors duration-150 ${
                  slideActivo === idx ? 'w-8 bg-orange-500' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Ver foto ${idx + 1}`}
              />
            ))}
          </nav>
        )}
      </header>

      {/* Contenido Principal */}
      <main className="mx-auto max-w-6xl w-full px-4 py-8 sm:py-12 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10">
          {/* Columna Izquierda: Partidos y Calendario */}
          <section className="lg:col-span-7 flex flex-col gap-6">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h2 className="text-xl font-bold font-display uppercase tracking-wider text-text">
                  Últimos Resultados
                </h2>
                <p className="text-sm text-text-muted">
                  Partidos recientes en {torneo_activo?.categoria || 'LBA'}
                </p>
              </div>
              <Link
                to="/resultados"
                className="text-sm font-bold text-orange-600 dark:text-orange-400 hover:text-orange-500 transition-colors duration-150"
              >
                Ver todos los resultados ›
              </Link>
            </div>

            {ultimos_partidos.length === 0 ? (
              <p data-ui="empty-state" className="py-8 text-center text-sm text-text-muted rounded-xl border border-border bg-surface">
                No hay partidos jugados registrados en esta categoría
              </p>
            ) : (
              <div data-ui="results-feed" className="flex flex-col gap-3">
                <div className="flex flex-col gap-3">
                  {ultimos_partidos.slice(0, 2).map((p) => (
                    <PartidoScorecard key={p.id} partido={p} jugado />
                  ))}
                </div>
                {ultimos_partidos.length > 2 && (
                  <div className="flex flex-col gap-3">
                    {ultimos_partidos.slice(2, 4).map((p) => (
                      <PartidoScorecard key={p.id} partido={p} jugado />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Próximos partidos */}
            {proximos_partidos.length > 0 && (
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2">
                  <div>
                    <h3 className="text-lg font-bold font-display uppercase tracking-wider text-text">
                      Próxima Fecha
                    </h3>
                    <p className="text-sm text-text-muted">Partidos agendados a disputarse</p>
                  </div>
                  <Link
                    to="/proximos"
                    className="text-sm font-bold text-orange-600 dark:text-orange-400 hover:text-orange-500 transition-colors duration-150"
                  >
                    Ver fixture completo ›
                  </Link>
                </div>
                <div className="flex flex-col gap-3">
                  {proximos_partidos.slice(0, 2).map((p) => (
                    <PartidoScorecard key={p.id} partido={p} jugado={false} />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Columna Derecha: Tablas y Estadísticas */}
          <aside className="lg:col-span-5 flex flex-col gap-6">
            {/* Tabla de Posiciones */}
            <div data-ui="standings-panel" className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between pb-3 mb-3">
                <div>
                  <h3 className="text-base font-bold font-display uppercase tracking-wider text-text">
                    Posiciones
                  </h3>
                  {posiciones_categorias.length <= 1 && (
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                      {catPosActual?.torneo?.categoria || torneo_activo?.categoria || 'LBA'}
                    </span>
                  )}
                </div>
                <Link
                  to="/posiciones"
                  onClick={() => {
                    if (catPosActual?.torneo) seleccionar(catPosActual.torneo)
                  }}
                  className="text-sm font-bold text-text-muted hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-150"
                >
                  Tabla completa ›
                </Link>
              </div>

              {posiciones_categorias.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5 pb-3 mb-2" role="tablist" aria-label="Categorías de posiciones">
                  {posiciones_categorias.map((c) => {
                    const activa = catPosActual?.torneo?.id === c.torneo.id
                    return (
                      <button
                        key={c.torneo.id}
                        type="button"
                        role="tab"
                        aria-selected={activa}
                        onClick={() => {
                          setCategoriaPosId(c.torneo.id)
                          seleccionar(c.torneo)
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                          activa
                            ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/40'
                            : 'bg-page text-text-muted border border-border hover:text-text'
                        }`}
                      >
                        {c.torneo.categoria}
                        {c.torneo.grupo ? ` · ${c.torneo.grupo}` : ''}
                      </button>
                    )
                  })}
                </div>
              )}

              {posicionesMostradas.length === 0 ? (
                <p className="py-6 text-center text-xs text-text-muted">Sin datos de tabla aún en esta categoría</p>
              ) : (
                <div className="overflow-x-auto" data-ui="table">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[11px] font-bold text-text-muted">
                        <th className="py-2 px-1 w-6 text-center">#</th>
                        <th className="py-2 px-2">Equipo</th>
                        <th className="py-2 px-1.5 text-center">PJ</th>
                        <th className="py-2 px-1.5 text-center">PG</th>
                        <th className="py-2 px-1.5 text-center">PP</th>
                        <th className="py-2 px-2 text-right">PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posicionesMostradas.map((pos) => (
                        <tr key={pos.equipo_id} className="hover:bg-page transition-colors duration-150">
                          <td className="py-2.5 px-1 text-center font-athletic font-bold text-sm tabular-nums">
                            <span className={pos.posicion <= 3 ? 'text-orange-600 dark:text-orange-400' : 'text-text-muted'}>
                              {pos.posicion}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 font-semibold text-text">
                            <div className="flex items-center gap-2 min-w-0">
                              <EscudoEquipo url={pos.escudo_url} nombre={pos.equipo} className="w-5 h-5 shrink-0" />
                              <span className="truncate text-xs">{pos.equipo}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-1.5 text-center text-text-muted font-medium tabular-nums">{pos.pj}</td>
                          <td className="py-2.5 px-1.5 text-center font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{pos.pg}</td>
                          <td className="py-2.5 px-1.5 text-center font-bold text-rose-600 dark:text-rose-400 tabular-nums">{pos.pp}</td>
                          <td className="py-2.5 px-2 text-right font-athletic text-sm font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                            {pos.puntos}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Máximos Anotadores */}
            <div data-ui="leaders-panel" className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between pb-3 mb-3">
                <div>
                  <h3 className="text-base font-bold font-display uppercase tracking-wider text-text">
                    Máximos Anotadores
                  </h3>
                  <span className="text-sm text-text-muted">Líderes de puntos del torneo</span>
                </div>
                <Link
                  to="/goleadores"
                  className="text-sm font-bold text-text-muted hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-150"
                >
                  Ranking completo ›
                </Link>
              </div>

              {top_goleadores.length === 0 ? (
                <p className="py-6 text-center text-xs text-text-muted">Sin estadísticas registradas aún</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {top_goleadores.map((g, idx) => (
                    <div
                      key={g.jugador_id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-page hover:border-orange-500/50 transition-colors duration-150"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-6 h-6 rounded flex items-center justify-center font-athletic font-bold text-xs tabular-nums shrink-0 ${
                            idx === 0
                              ? 'bg-orange-600 text-white'
                              : idx === 1
                              ? 'bg-slate-300 dark:bg-slate-700 text-text'
                              : 'bg-page border border-border text-text-muted'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <EscudoEquipo url={g.escudo_url} nombre={g.equipo} className="w-6 h-6 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text truncate">{g.jugador}</p>
                          <p className="text-xs text-text-muted truncate">{g.equipo}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="block font-athletic text-sm font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                          {g.puntos} pts
                        </span>
                        <span className="block text-xs text-text-muted tabular-nums">
                          {g.promedio?.toFixed(1) || '0.0'} ppp
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Sponsors Oficiales */}
      {sponsorsActivos.length > 0 && (
        <section data-ui="sponsors-bar" className="bg-surface py-8">
          <div className="mx-auto max-w-6xl px-4 text-center">
            <h4 className="text-sm font-bold font-display uppercase text-text-muted mb-4">
              Sponsors Oficiales LBA
            </h4>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {sponsorsActivos.map((s) => {
                const isUrlSegura =
                  s.url_sitio &&
                  (s.url_sitio.startsWith('http://') || s.url_sitio.startsWith('https://'))

                const cardInner = (
                  <>
                    {s.logo_url ? (
                      <img
                        src={s.logo_url}
                        alt={s.nombre}
                        width="32"
                        height="32"
                        loading="lazy"
                        className="h-8 w-8 rounded object-contain shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded bg-page border border-border flex items-center justify-center font-display font-bold text-xs text-text-muted">
                        {s.nombre.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-bold uppercase text-text">{s.nombre}</span>
                  </>
                )

                if (isUrlSegura) {
                  return (
                    <a
                      key={s.id}
                      href={s.url_sitio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-2 rounded-lg border border-border bg-page hover:border-orange-500/60 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    >
                      {cardInner}
                    </a>
                  )
                }

                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg border border-border bg-page"
                  >
                    {cardInner}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
