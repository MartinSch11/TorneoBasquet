import { useParams, Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { useTorneo } from '../hooks/useTorneo'
import api from '../services/api'
import Spinner from '../components/ui/Spinner'
import EscudoEquipo from '../components/ui/EscudoEquipo'

export default function FichaEquipo() {
  const { id } = useParams()
  const { torneoSeleccionado } = useTorneo()
  const { data, loading, error } = useApi(
    async () => {
      const res = await api.get(`/equipos/${id}`, {
        params: torneoSeleccionado ? { torneo_id: torneoSeleccionado.id } : {},
      })
      return res.data
    },
    [id, torneoSeleccionado?.id],
  )

  if (loading) return <Spinner />
  if (error) return <p className="mx-auto max-w-6xl px-4 py-6 text-danger">{error}</p>
  if (!data) return null

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <Link
        to="/equipos"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-text-muted hover:text-orange-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-md"
      >
        ‹ Volver a equipos
      </Link>
      <header className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-surface p-6 sm:flex-row">
        <EscudoEquipo url={data.escudo_url} nombre={data.nombre} className="h-20 w-20 shrink-0" />
        <div className="text-center sm:text-left">
          <h1 className="font-display text-4xl font-bold tracking-tight text-text text-balance">{data.nombre}</h1>
          <p className="text-sm font-medium text-text-muted mt-1 tabular-nums">
            {data.pj} PJ · {data.pg} PG · {data.pp} PP
          </p>
        </div>
      </header>

      <h2 className="mt-6 font-display text-2xl font-bold tracking-tight text-text text-balance">Plantel</h2>
      <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface" data-ui="roster-container">
        {data.jugadores.length === 0 ? (
          <p className="px-4 py-8 text-center text-text-muted">Sin jugadores cargados</p>
        ) : (
          <table className="w-full text-sm" data-ui="roster-table">
            <thead className="bg-surface-raised text-left text-xs uppercase font-bold text-text-muted" data-ui="table-head">
              <tr>
                <th scope="col" className="w-16 px-4 py-3 text-center">#</th>
                <th scope="col" className="px-4 py-3">Jugador</th>
              </tr>
            </thead>
            <tbody data-ui="table-body" className="divide-y divide-border/40">
              {data.jugadores.map((j) => (
                <tr key={j.id} className="hover:bg-orange-500/10 transition-colors" data-ui="roster-row">
                  <td className="w-16 px-4 py-3 text-center font-athletic text-base font-bold tabular-nums text-orange-600 dark:text-orange-400">
                    {j.numero !== null && j.numero !== undefined ? j.numero : '-'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-text">
                    <div className="flex items-center gap-3">
                      {j.foto_url && (
                        <img
                          src={j.foto_url}
                          alt={`Foto de ${j.nombre}`}
                          width="40"
                          height="40"
                          className="h-10 w-10 rounded-full object-cover shrink-0"
                          loading="lazy"
                        />
                      )}
                      <span>{j.nombre}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}