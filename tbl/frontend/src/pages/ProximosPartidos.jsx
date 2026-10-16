import { useTorneo } from '../hooks/useTorneo'
import { useApi } from '../hooks/useApi'
import api from '../services/api'
import TorneoSelector from '../components/ui/TorneoSelector'
import Spinner from '../components/ui/Spinner'
import TarjetaPartido from '../components/torneo/TarjetaPartido'

export default function ProximosPartidos() {
  const { torneoSeleccionado } = useTorneo()
  const { data, loading, error } = useApi(
    async () => {
      if (!torneoSeleccionado) return []
      const res = await api.get(`/torneos/${torneoSeleccionado.id}/proximos-partidos`)
      return res.data
    },
    [torneoSeleccionado?.id],
  )

  const porFecha = {}
  for (const p of data || []) {
    const key = p.numero_fecha ? `Fecha ${p.numero_fecha}` : p.fecha || 'Próximos'
    if (!porFecha[key]) porFecha[key] = []
    porFecha[key].push(p)
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text text-balance">Próximos Partidos</h1>
          <p className="text-sm font-medium text-text-muted text-pretty">Fixture de los partidos por jugar</p>
        </div>
        <TorneoSelector />
      </div>

      {loading && <Spinner label="Cargando próximos partidos…" />}
      {error && <p className="rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-danger">{error}</p>}
      {!loading && !error && Object.keys(porFecha).length === 0 && (
        <p className="py-8 text-center text-text-muted">No hay partidos próximos cargados</p>
      )}
      {!loading &&
        !error &&
        Object.entries(porFecha).map(([titulo, partidos]) => (
          <div key={titulo} className="mb-6">
            <h2 className="mb-3 font-display text-xl font-bold tracking-tight text-orange-600 dark:text-orange-400 text-balance">{titulo}</h2>
            <div className="flex flex-col gap-3">
              {partidos.map((p) => (
                <TarjetaPartido key={p.id} partido={p} />
              ))}
            </div>
          </div>
        ))}
    </section>
  )
}