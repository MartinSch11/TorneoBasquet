import { useMemo, useState } from 'react'
import { useTorneo } from '../hooks/useTorneo'
import { useApi } from '../hooks/useApi'
import api from '../services/api'
import TorneoSelector from '../components/ui/TorneoSelector'
import TablaOrdenable from '../components/ui/TablaOrdenable'
import Spinner from '../components/ui/Spinner'
import { IconSearch, IconClose } from '../components/ui/Icon'
import EscudoEquipo from '../components/ui/EscudoEquipo'

export default function Goleadores() {
  const { torneoSeleccionado } = useTorneo()
  const [busqueda, setBusqueda] = useState('')
  const { data, loading, error } = useApi(
    async () => {
      if (!torneoSeleccionado) return []
      const res = await api.get(`/torneos/${torneoSeleccionado.id}/goleadores`)
      return res.data
    },
    [torneoSeleccionado?.id],
  )

  const columnas = [
    { key: 'posicion', label: '#', sortable: true, render: (f) => <span className="font-athletic font-bold tabular-nums text-orange-600 dark:text-orange-400">{f.posicion}</span> },
    { key: 'jugador', label: 'Jugador', sortable: true, render: (f) => <span className="font-semibold text-text">{f.jugador}</span> },
    {
      key: 'equipo',
      label: 'Equipo',
      sortable: true,
      render: (f) => (
        <div className="flex items-center gap-2 min-w-0">
          <EscudoEquipo url={f.escudo_url} nombre={f.equipo} className="w-5 h-5 shrink-0" />
          <span className="text-text-muted truncate">{f.equipo}</span>
        </div>
      ),
    },
    { key: 'pj', label: 'PJ', sortable: true },
    { key: 'puntos', label: 'Puntos', sortable: true, render: (f) => <span className="font-extrabold font-athletic text-base tabular-nums text-orange-600 dark:text-orange-400">{f.puntos}</span> },
    { key: 'promedio', label: 'Promedio', sortable: true, render: (f) => <span className="font-medium tabular-nums text-text">{f.promedio}</span> },
  ]

  const filas = useMemo(() => (data || []).map((g, i) => ({ ...g, posicion: i + 1 })), [data])

function normalizarTexto(str) {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

  const filasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return filas
    const q = normalizarTexto(busqueda)
    return filas.filter(
      (f) =>
        (f.jugador && normalizarTexto(f.jugador).includes(q)) ||
        (f.equipo && normalizarTexto(f.equipo).includes(q)),
    )
  }, [filas, busqueda])

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text text-balance">Goleadores</h1>
          <p className="text-sm text-text-muted text-pretty">Ranking de máximos anotadores</p>
        </div>
        <TorneoSelector />
      </div>

      <div className="mb-4 flex justify-end">
        <div className="relative w-full sm:w-64 shrink-0">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            name="busqueda"
            aria-label="Buscar jugador o equipo"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar jugador o equipo…"
            className="w-full rounded-xl border border-border bg-surface pl-9 pr-8 py-2 text-xs text-text placeholder-text-muted outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 grid h-6 w-6 min-w-0 min-h-0 place-items-center rounded-full text-text-muted hover:bg-page hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              aria-label="Limpiar búsqueda"
            >
              <IconClose className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading && <Spinner label="Cargando goleadores…" />}
      {error && <p className="rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-danger">{error}</p>}
      {!loading && !error && (
        <TablaOrdenable
          columns={columnas}
          data={filasFiltradas}
          ordenInicial={['posicion', 'puntos']}
          rowKey="jugador_id"
          itemLabel="jugadores"
        />
      )}
    </section>
  )
}