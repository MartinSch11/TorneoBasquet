import { useEffect, useMemo, useState } from 'react'
import PhotoSwipe from 'photoswipe'
import 'photoswipe/style.css'
import { useApi } from '../hooks/useApi'
import api from '../services/api'
import Spinner from '../components/ui/Spinner'
import GaleriaGrid from '../components/galeria/GaleriaGrid'

const LIMIT = 12

function paginas(total, limit) {
  return Math.max(1, Math.ceil(total / limit))
}

export default function Galeria() {
  const [page, setPage] = useState(1)
  const [pswp, setPswp] = useState(null)
  const { data, loading, error } = useApi(async () => {
    const res = await api.get(`/galeria/fotos?page=${page}&limit=${LIMIT}`)
    return res.data
  }, [page])

  const fotos = data?.items || []
  const total = data?.total || 0
  const maxPaginas = paginas(total, LIMIT)

  const dataSource = useMemo(
    () =>
      fotos.map((f) => ({
        src: f.url,
        width: 1600,
        height: 1067,
        alt: f.titulo || 'Foto de la galería',
      })),
    [fotos],
  )

  const abrir = (foto, index) => {
    const luz = new PhotoSwipe({ dataSource, index, pswpModule: PhotoSwipe })
    luz.init()
    setPswp(luz)
  }

  useEffect(() => {
    return () => {
      pswp?.destroy()
    }
  }, [pswp])

  const ir = (n) => setPage(Math.min(maxPaginas, Math.max(1, n)))

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4">
        <h1 className="font-display text-3xl font-bold tracking-tight text-text text-balance">Galería de Fotos</h1>
        <p className="text-sm font-medium text-text-muted text-pretty tabular-nums">
          {total > 0 ? `${total} fotos · página ${page} de ${maxPaginas}` : 'Galería'}
        </p>
      </div>

      {loading && <Spinner label="Cargando galería…" />}
      {error && <p className="rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-danger">{error}</p>}
      {!loading && !error && (
        <>
          {fotos.length === 0 ? (
            <p className="py-8 text-center text-text-muted">Sin fotos todavía</p>
          ) : (
            <GaleriaGrid fotos={fotos} onAbrir={abrir} />
          )}
          {maxPaginas > 1 && (
            <nav className="mt-6 flex flex-wrap items-center justify-center gap-1" aria-label="Paginación">
              <button
                type="button"
                onClick={() => ir(1)}
                disabled={page === 1}
                className="rounded-xl border border-border bg-surface px-3 py-2 text-text disabled:opacity-40 hover:border-orange-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                aria-label="Primera página"
              >
                «
              </button>
              <button
                type="button"
                onClick={() => ir(page - 1)}
                disabled={page === 1}
                className="rounded-xl border border-border bg-surface px-3 py-2 text-text disabled:opacity-40 hover:border-orange-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                aria-label="Página anterior"
              >
                ‹
              </button>
              {Array.from({ length: maxPaginas }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => ir(n)}
                  aria-current={n === page ? 'page' : undefined}
                  className={`rounded-xl border px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                    n === page
                      ? 'border-orange-600 bg-orange-600 text-white font-bold'
                      : 'border-border bg-surface text-text-muted hover:text-text hover:border-orange-500'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => ir(page + 1)}
                disabled={page === maxPaginas}
                className="rounded-xl border border-border bg-surface px-3 py-2 text-text disabled:opacity-40 hover:border-orange-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                aria-label="Página siguiente"
              >
                ›
              </button>
              <button
                type="button"
                onClick={() => ir(maxPaginas)}
                disabled={page === maxPaginas}
                className="rounded-xl border border-border bg-surface px-3 py-2 text-text disabled:opacity-40 hover:border-orange-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                aria-label="Última página"
              >
                »
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  )
}