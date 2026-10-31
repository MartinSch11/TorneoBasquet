import { useEffect, useState } from 'react'
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
  const [activeIdx, setActiveIdx] = useState(null)
  const { data, loading, error } = useApi(async () => {
    const res = await api.get(`/galeria/fotos?page=${page}&limit=${LIMIT}`)
    return res.data
  }, [page])

  const fotos = data?.items || []
  const total = data?.total || 0
  const maxPaginas = paginas(total, LIMIT)

  const activeFoto = activeIdx !== null ? fotos[activeIdx] : null

  useEffect(() => {
    if (activeIdx === null) return

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setActiveIdx(null)
      else if (e.key === 'ArrowLeft') setActiveIdx((i) => (i > 0 ? i - 1 : fotos.length - 1))
      else if (e.key === 'ArrowRight') setActiveIdx((i) => (i < fotos.length - 1 ? i + 1 : 0))
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activeIdx, fotos.length])

  const abrir = (_foto, index) => setActiveIdx(index)
  const cerrar = () => setActiveIdx(null)

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

      {activeFoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visualizador de fotos"
          data-ui="lightbox"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4 sm:p-6 animate-fade-in"
          onClick={cerrar}
        >
          <div className="absolute top-4 inset-x-4 flex items-center justify-between text-white/80 z-10" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm font-medium tabular-nums bg-black/40 px-3 py-1 rounded-full border border-white/10">
              {activeIdx + 1} / {fotos.length}
            </span>
            <button
              type="button"
              onClick={cerrar}
              className="rounded-full bg-black/40 p-2 text-white/90 hover:text-white hover:bg-black/60 border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              aria-label="Cerrar visor"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {fotos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setActiveIdx((i) => (i > 0 ? i - 1 : fotos.length - 1))
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-3 text-white/90 hover:text-white hover:bg-black/60 border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors z-10"
              aria-label="Foto anterior"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <div className="relative flex flex-col items-center max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={activeFoto.url}
              alt={activeFoto.titulo || 'Foto de la galería'}
              className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg border border-white/10 select-none"
            />
            {activeFoto.titulo && (
              <p className="mt-3 text-center text-sm font-medium text-white/90 bg-black/40 px-4 py-1.5 rounded-full border border-white/10 max-w-md truncate">
                {activeFoto.titulo}
              </p>
            )}
          </div>

          {fotos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setActiveIdx((i) => (i < fotos.length - 1 ? i + 1 : 0))
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-3 text-white/90 hover:text-white hover:bg-black/60 border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors z-10"
              aria-label="Foto siguiente"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </section>
  )
}