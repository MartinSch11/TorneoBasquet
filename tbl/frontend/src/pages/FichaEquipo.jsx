import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { useTorneo } from '../hooks/useTorneo'
import api from '../services/api'
import Spinner from '../components/ui/Spinner'
import EscudoEquipo from '../components/ui/EscudoEquipo'
import { formatFase } from '../utils/formatFase'

export default function FichaEquipo() {
  const { id } = useParams()
  const { torneoSeleccionado, torneos: torneosGlobales, seleccionar } = useTorneo()
  const [torneoFiltroId, setTorneoFiltroId] = useState(null)

  const activeTorneoId = torneoFiltroId ?? torneoSeleccionado?.id ?? null

  const { data, loading, error } = useApi(
    async () => {
      const params = activeTorneoId ? { torneo_id: activeTorneoId } : {}
      const res = await api.get(`/equipos/${id}`, { params })
      return res.data
    },
    [id, activeTorneoId],
  )

  if (loading) return <Spinner label="Cargando ficha del equipo…" />
  if (error) return <p className="mx-auto max-w-6xl px-4 py-6 text-danger">{error}</p>
  if (!data) return null

  const torneosDisponibles =
    data.torneos && data.torneos.length > 0 ? data.torneos : torneosGlobales || []
  const torneoActivoId =
    torneoFiltroId ?? data.torneo_actual_id ?? torneoSeleccionado?.id ?? ''

  const handleTorneoChange = (e) => {
    const val = e.target.value ? Number(e.target.value) : null
    setTorneoFiltroId(val)
    if (val && torneosGlobales) {
      const match = torneosGlobales.find((t) => t.id === val)
      if (match) seleccionar(match)
    }
  }

  const partidos = data.partidos_disputados || []

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <Link
        to="/equipos"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-text-muted hover:text-orange-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-md"
      >
        ‹ Volver a equipos
      </Link>

      {/* Cabecera del Equipo */}
      <header className="flex flex-col items-center gap-5 rounded-xl border border-border bg-surface p-5 sm:p-6 sm:flex-row">
        <EscudoEquipo url={data.escudo_url} nombre={data.nombre} className="h-16 w-16 sm:h-20 sm:w-20 shrink-0" />
        <div className="text-center sm:text-left">
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-text text-balance">
            {data.nombre}
          </h1>
          <p className="text-sm font-medium text-text-muted mt-1 tabular-nums">
            {data.pj} PJ · {data.pg} PG · {data.pp} PP
          </p>
        </div>
      </header>

      {/* Partidos Disputados */}
      <div className="mt-8">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-text text-balance">
            Partidos disputados
          </h2>
          {torneosDisponibles.length > 0 && (
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-text-muted">
              <span>Torneo:</span>
              <select
                value={torneoActivoId}
                onChange={handleTorneoChange}
                className="h-9 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs sm:text-sm font-semibold text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors cursor-pointer max-w-full"
                aria-label="Seleccionar torneo para filtrar partidos"
              >
                {torneosDisponibles.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.etiqueta || `${t.categoria} ${t.edicion} · ${t.temporada}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-surface no-scrollbar">
          {partidos.length === 0 ? (
            <p className="px-4 py-8 text-center text-text-muted text-sm">
              Sin partidos disputados en este torneo
            </p>
          ) : (
            <table data-ui="data-table" className="w-full text-left text-sm border-collapse min-w-[540px]">
              <thead data-ui="table-head" className="bg-page border-b border-border text-xs uppercase font-bold text-text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3">Fase</th>
                  <th scope="col" className="px-3 py-3">Instancia</th>
                  <th scope="col" className="px-3 py-3 text-center">Día</th>
                  <th scope="col" className="px-3 py-3 text-center">Fecha</th>
                  <th scope="col" className="px-4 py-3">Versus</th>
                  <th scope="col" className="px-4 py-3 text-center">Resultado</th>
                </tr>
              </thead>
              <tbody data-ui="table-body" className="divide-y divide-border/60">
                {partidos.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-orange-500/10 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold uppercase text-xs text-text-muted whitespace-nowrap">
                      {formatFase(p.fase)}
                    </td>
                    <td className="px-3 py-3 font-medium text-text whitespace-nowrap">
                      {p.instancia}
                    </td>
                    <td className="px-3 py-3 text-center font-medium tabular-nums text-text-muted whitespace-nowrap">
                      {p.dia || '-'}
                    </td>
                    <td className="px-3 py-3 text-center font-bold tabular-nums text-text whitespace-nowrap">
                      {p.fecha_numero ?? '-'}
                    </td>
                    <td className="px-4 py-3 font-bold uppercase text-text">
                      <div className="flex items-center gap-2 min-w-0">
                        {p.versus_escudo_url && (
                          <img
                            src={p.versus_escudo_url}
                            alt=""
                            className="h-5 w-5 object-contain shrink-0"
                            loading="lazy"
                          />
                        )}
                        <span className="truncate">{p.versus}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <Link
                        to={`/partidos/${p.id}`}
                        className="inline-flex items-center gap-1 font-bold hover:text-orange-500 transition-colors"
                        title="Ver detalle del partido"
                      >
                        <span
                          className={`font-extrabold px-1.5 py-0.5 rounded text-xs ${
                            p.gano
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {p.gano ? 'G' : 'P'}
                        </span>
                        <span className="text-text tabular-nums font-athletic text-base ml-1">{p.pts_local}-{p.pts_visitante}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Jugadores y Estadísticas */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-text text-balance">
            Plantel y Estadísticas
          </h2>
          <span className="text-xs text-text-muted tabular-nums">
            {data.jugadores.length} jugadores
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-surface no-scrollbar">
          {data.jugadores.length === 0 ? (
            <p className="px-4 py-8 text-center text-text-muted text-sm">
              Sin jugadores cargados
            </p>
          ) : (
            <table data-ui="data-table" className="w-full text-left text-sm border-collapse min-w-[700px]">
              <thead data-ui="table-head" className="bg-page border-b border-border text-xs uppercase font-bold text-text-muted">
                <tr>
                  <th scope="col" className="sticky left-0 z-20 bg-page w-10 min-w-[38px] max-w-[38px] px-2 py-3 text-center">
                    #
                  </th>
                  <th scope="col" data-ui="sticky-col" className="sticky left-[38px] z-20 bg-page border-r border-border px-3 py-3 text-left min-w-[120px] max-w-[150px] sm:max-w-none truncate">
                    Nombre
                  </th>
                  <th scope="col" className="px-2.5 py-3 text-center">PJ</th>
                  <th scope="col" className="px-2.5 py-3 text-center">1%</th>
                  <th scope="col" className="px-2.5 py-3 text-center">2%</th>
                  <th scope="col" className="px-2.5 py-3 text-center">3%</th>
                  <th scope="col" className="px-2.5 py-3 text-center text-orange-600 dark:text-orange-400 font-extrabold">Ptos</th>
                  <th scope="col" className="px-2.5 py-3 text-center">PP</th>
                  <th scope="col" className="px-2.5 py-3 text-center">As</th>
                  <th scope="col" className="px-2.5 py-3 text-center">RO</th>
                  <th scope="col" className="px-2.5 py-3 text-center">RD</th>
                  <th scope="col" className="px-2.5 py-3 text-center">FP</th>
                  <th scope="col" className="px-2.5 py-3 text-center">FR</th>
                  <th scope="col" className="px-2.5 py-3 text-center">PF</th>
                  <th scope="col" className="px-2.5 py-3 text-center">Re</th>
                  <th scope="col" className="px-2.5 py-3 text-center">Pe</th>
                  <th scope="col" className="px-2.5 py-3 text-center">Bl</th>
                  <th scope="col" className="px-3 py-3 text-center">Val</th>
                </tr>
              </thead>
              <tbody data-ui="table-body" className="divide-y divide-border/60">
                {data.jugadores.map((j, idx) => {
                  const rowBg = idx % 2 === 0 ? 'bg-surface' : 'bg-page'
                  return (
                    <tr
                      key={j.id}
                      className={`${rowBg} hover:bg-orange-500/10 transition-colors`}
                    >
                      <td className={`sticky left-0 z-10 ${rowBg} w-10 min-w-[38px] max-w-[38px] px-2 py-3 text-center font-athletic text-base font-bold tabular-nums text-orange-600 dark:text-orange-400 whitespace-nowrap`}>
                        {j.numero !== null && j.numero !== undefined ? j.numero : '-'}
                      </td>
                      <td data-ui="sticky-col" className={`sticky left-[38px] z-10 ${rowBg} border-r border-border px-3 py-3 font-semibold text-text max-w-[120px] sm:max-w-none truncate whitespace-nowrap`}>
                        {j.nombre}
                      </td>
                      <td className="px-2.5 py-3 text-center tabular-nums text-text font-medium whitespace-nowrap">
                        {j.pj ?? 0}
                      </td>
                      <td className="px-2.5 py-3 text-center tabular-nums text-text-muted text-xs font-medium whitespace-nowrap">
                        {(j.pct_1 ?? 0).toFixed(2)}
                      </td>
                      <td className="px-2.5 py-3 text-center tabular-nums text-text-muted text-xs font-medium whitespace-nowrap">
                        {(j.pct_2 ?? 0).toFixed(2)}
                      </td>
                      <td className="px-2.5 py-3 text-center tabular-nums text-text-muted text-xs font-medium whitespace-nowrap">
                        {(j.pct_3 ?? 0).toFixed(2)}
                      </td>
                      <td className="px-2.5 py-3 text-center tabular-nums text-orange-600 dark:text-orange-400 font-athletic font-bold text-base whitespace-nowrap">
                        {j.ptos ?? 0}
                      </td>
                      <td className="px-2.5 py-3 text-center tabular-nums text-text font-medium text-xs whitespace-nowrap">
                        {(j.pp ?? 0).toFixed(2)}
                      </td>
                      <td className="px-2.5 py-3 text-center tabular-nums text-text font-medium text-xs whitespace-nowrap">
                        {j.asistencias ?? 0}
                      </td>
                      <td className="px-2.5 py-3 text-center tabular-nums text-text-muted text-xs font-medium whitespace-nowrap">
                        {j.ro ?? 0}
                      </td>
                      <td className="px-2.5 py-3 text-center tabular-nums text-text-muted text-xs font-medium whitespace-nowrap">
                        {j.rd ?? 0}
                      </td>
                      <td className="px-2.5 py-3 text-center tabular-nums text-text-muted text-xs font-medium whitespace-nowrap">
                        {j.fp ?? 0}
                      </td>
                      <td className="px-2.5 py-3 text-center tabular-nums text-text-muted text-xs font-medium whitespace-nowrap">
                        {j.fr ?? 0}
                      </td>
                      <td className="px-2.5 py-3 text-center tabular-nums text-text-muted text-xs font-medium whitespace-nowrap">
                        {(j.pf ?? 0).toFixed(2)}
                      </td>
                      <td className="px-2.5 py-3 text-center tabular-nums text-text font-medium text-xs whitespace-nowrap">
                        {j.recuperos ?? 0}
                      </td>
                      <td className="px-2.5 py-3 text-center tabular-nums text-text-muted text-xs font-medium whitespace-nowrap">
                        {j.perdidas ?? 0}
                      </td>
                      <td className="px-2.5 py-3 text-center tabular-nums text-text-muted text-xs font-medium whitespace-nowrap">
                        {j.bloqueos ?? 0}
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums font-bold text-xs text-text whitespace-nowrap">
                        {(j.val ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  )
}
