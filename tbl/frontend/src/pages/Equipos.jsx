import { useTorneo } from '../hooks/useTorneo'
import { useApi } from '../hooks/useApi'
import api from '../services/api'
import TorneoSelector from '../components/ui/TorneoSelector'
import Spinner from '../components/ui/Spinner'
import TarjetaEquipo from '../components/torneo/TarjetaEquipo'

export default function Equipos() {
  const { torneoSeleccionado } = useTorneo()
  const { data, loading, error } = useApi(
    async () => {
      const res = await api.get('/equipos', {
        params: torneoSeleccionado ? { torneo_id: torneoSeleccionado.id } : {},
      })
      return res.data
    },
    [torneoSeleccionado?.id],
  )

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text text-balance">Equipos</h1>
          <p className="text-sm text-text-muted text-pretty">Elegí un equipo para ver su ficha</p>
        </div>
        <TorneoSelector />
      </div>

      {loading && <Spinner label="Cargando equipos…" />}
      {error && <p className="rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-danger">{error}</p>}
      {!loading && !error && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {(data || []).map((e) => (
            <TarjetaEquipo key={e.id} equipo={e} />
          ))}
        </div>
      )}
    </section>
  )
}