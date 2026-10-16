import { useTorneo } from '../hooks/useTorneo'
import { useApi } from '../hooks/useApi'
import api from '../services/api'
import TorneoSelector from '../components/ui/TorneoSelector'
import TablaOrdenable from '../components/ui/TablaOrdenable'
import Spinner from '../components/ui/Spinner'
import EscudoEquipo from '../components/ui/EscudoEquipo'

export default function Posiciones() {
  const { torneoSeleccionado } = useTorneo()
  const { data, loading, error } = useApi(
    async () => {
      if (!torneoSeleccionado) return []
      const res = await api.get(`/torneos/${torneoSeleccionado.id}/posiciones`)
      return res.data
    },
    [torneoSeleccionado?.id],
  )

  const columnas = [
    {
      key: 'posicion',
      label: '#',
      sortable: true,
      render: (f) => (
        <span className={`font-athletic text-base font-bold tabular-nums ${f.posicion <= 4 ? 'text-orange-600 dark:text-orange-400' : 'text-text-muted'}`}>
          {f.posicion}
        </span>
      ),
    },
    {
      key: 'equipo',
      label: 'Equipo',
      sortable: true,
      render: (f) => (
        <div className="flex items-center gap-2">
          <EscudoEquipo url={f.escudo_url} nombre={f.equipo} className="h-6 w-6" />
          <span className="font-semibold text-text truncate max-w-[120px] sm:max-w-none">{f.equipo}</span>
        </div>
      ),
    },
    { key: 'pj', label: 'PJ', sortable: true },
    { key: 'pg', label: 'PG', sortable: true, render: (f) => <span className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">{f.pg}</span> },
    { key: 'pp', label: 'PP', sortable: true, render: (f) => <span className="text-rose-700 dark:text-rose-400 font-bold tabular-nums">{f.pp}</span> },
    { key: 'puntos_favor', label: 'PF', sortable: true },
    { key: 'puntos_contra', label: 'PC', sortable: true },
    {
      key: 'dgo',
      label: 'DIF',
      sortable: true,
      render: (f) => {
        const dif = f.dgo ?? 0
        const isPos = dif > 0
        const isNeg = dif < 0
        return (
          <span className={`font-bold tabular-nums ${isPos ? 'text-emerald-700 dark:text-emerald-400' : isNeg ? 'text-rose-700 dark:text-rose-400' : 'text-text-muted'}`}>
            {isPos ? `+${dif}` : dif}
          </span>
        )
      },
    },
    { key: 'porcentaje', label: '%', sortable: true, render: (f) => <span className="font-medium tabular-nums">{f.porcentaje}%</span> },
    { key: 'puntos', label: 'Ptos', sortable: true, render: (f) => <span className="font-extrabold font-athletic text-base tabular-nums text-orange-600 dark:text-orange-400">{f.puntos}</span> },
  ]

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text text-balance">Posiciones</h1>
          <p className="text-sm text-text-muted text-pretty">Tabla de posiciones del torneo</p>
        </div>
        <TorneoSelector />
      </div>

      {loading && <Spinner label="Cargando posiciones…" />}
      {error && <p className="rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-danger">{error}</p>}
      {!loading && !error && (
        <TablaOrdenable
          columns={columnas}
          data={data || []}
          ordenInicial={['posicion']}
          rowKey="equipo_id"
          itemLabel="equipos"
        />
      )}
    </section>
  )
}