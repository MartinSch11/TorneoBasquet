import { useState } from 'react'
import { useTorneo } from '../hooks/useTorneo'
import { useApi } from '../hooks/useApi'
import api from '../services/api'
import TorneoSelector from '../components/ui/TorneoSelector'
import Spinner from '../components/ui/Spinner'
import TarjetaPartido from '../components/torneo/TarjetaPartido'

const LIMIT = 20

export default function Resultados() {
  const { torneoSeleccionado } = useTorneo()
  const [page, setPage] = useState(1)
  const { data, loading, error } = useApi(
    async () => {
      if (!torneoSeleccionado) return { items: [], total: 0 }
      const res = await api.get(`/torneos/${torneoSeleccionado.id}/resultados?page=${page}&limit=${LIMIT}`)
      return { items: res.data, total: res.data.length }
    },
    [torneoSeleccionado?.id, page],
  )

  const partidos = data?.items || []
  const total = data?.total || 0
  const paginas = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text text-balance">Resultados</h1>
          <p className="text-sm font-medium text-text-muted text-pretty">Historial de partidos jugados</p>
        </div>
        <TorneoSelector />
      </div>

      {loading && <Spinner label="Cargando resultados…" />}
      {error && <p className="rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-danger">{error}</p>}
      {!loading && !error && (
        <>
          <div className="flex flex-col gap-3">
            {partidos.length === 0 ? (
              <p className="py-8 text-center text-text-muted">Sin resultados cargados</p>
            ) : (
              partidos.map((p) => <TarjetaPartido key={p.id} partido={p} jugado />)
            )}
          </div>
          {paginas > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page === 1}
                aria-label="Primera página"
                className="rounded-xl border border-border bg-surface px-3 py-2 text-text disabled:opacity-40 hover:border-orange-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                «
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Página anterior"
                className="rounded-xl border border-border bg-surface px-3 py-2 text-text disabled:opacity-40 hover:border-orange-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                ‹
              </button>
              <span className="px-2 text-sm font-semibold tabular-nums text-text-muted">
                {page} / {paginas}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(paginas, p + 1))}
                disabled={page === paginas}
                aria-label="Página siguiente"
                className="rounded-xl border border-border bg-surface px-3 py-2 text-text disabled:opacity-40 hover:border-orange-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                ›
              </button>
              <button
                type="button"
                onClick={() => setPage(paginas)}
                disabled={page === paginas}
                aria-label="Última página"
                className="rounded-xl border border-border bg-surface px-3 py-2 text-text disabled:opacity-40 hover:border-orange-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                »
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}