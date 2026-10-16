import { useEffect, useRef } from 'react'

export const METRICAS_EQUIPOS = [
  { key: 'puntos', label: 'Puntos', unidad: 'Puntos totales' },
  { key: 'efectividad', label: 'Efectividad', unidad: '% acierto' },
  { key: 'asistencias', label: 'Asistencias', unidad: 'Ast. totales' },
  { key: 'rebotes', label: 'Rebotes', unidad: 'Reb. totales' },
  { key: 'recuperos', label: 'Recuperos', unidad: 'Rec. totales' },
  { key: 'perdidas', label: 'Pérdidas', unidad: 'Pér. totales' },
  { key: 'faltas', label: 'Faltas', unidad: 'Faltas totales' },
  { key: 'bloqueos', label: 'Bloqueos', unidad: 'Bloq. totales' },
  { key: 'valoracion', label: 'Valoración', unidad: 'Val. FIBA' },
]

export const METRICAS_JUGADORES = [
  { key: 'puntos', label: 'Puntos', unidad: 'Puntos totales' },
  { key: 'asistencias', label: 'Asistencias', unidad: 'Ast. totales' },
  { key: 'rebotes', label: 'Rebotes', unidad: 'Reb. totales' },
  { key: 'recuperos', label: 'Recuperos', unidad: 'Rec. totales' },
  { key: 'perdidas', label: 'Pérdidas', unidad: 'Pér. totales' },
  { key: 'faltas', label: 'Faltas', unidad: 'Faltas totales' },
  { key: 'bloqueos', label: 'Bloqueos', unidad: 'Bloq. totales' },
  { key: 'valoracion', label: 'Valoración', unidad: 'Val. FIBA' },
]

export const METRICAS = METRICAS_EQUIPOS

const LABEL = Object.fromEntries(METRICAS_EQUIPOS.map((m) => [m.key, m.label]))

export default function SelectorMetrica({ metrica, setMetrica, list = METRICAS_EQUIPOS }) {
  const metricaActual = list.find((m) => m.key === metrica) || list[0]
  const containerRef = useRef(null)

  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.querySelector('[aria-selected="true"]')
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [metrica])

  return (
    <div className="relative mb-6">
      {/* Cabecera contextual en celular */}
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-bold uppercase text-text-muted">
          Categoría: <span className="text-orange-600 dark:text-orange-400 font-extrabold">{metricaActual?.label}</span>
        </span>
        <span className="text-[11px] font-medium text-orange-600 dark:text-orange-400 flex items-center gap-1 sm:hidden">
          <span>Deslizá para ver más</span>
          <span aria-hidden="true">→</span>
        </span>
      </div>

      {/* Contenedor de botones horizontal con shrink-0 para evitar superposición */}
      <div
        ref={containerRef}
        role="tablist"
        aria-label="Seleccionar métrica estadística"
        className="no-scrollbar flex items-center gap-2 overflow-x-auto snap-x snap-mandatory touch-pan-x py-1.5 px-1"
      >
        {list.map((m) => {
          const isSelected = metrica === m.key
          return (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setMetrica(m.key)}
              className={`shrink-0 snap-start whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${isSelected
                ? 'bg-orange-600 text-white border border-orange-600 font-extrabold'
                : 'bg-surface border border-border text-text-muted hover:border-orange-500/50 hover:text-text'
                }`}
            >
              {m.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
SelectorMetrica.LABEL = LABEL