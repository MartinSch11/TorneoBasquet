import { useTorneo } from '../../hooks/useTorneo'
import Spinner from './Spinner'

export default function TorneoSelector() {
  const { torneos, torneoSeleccionado, seleccionar, loading } = useTorneo()

  if (loading) return <Spinner label="Cargando torneos…" />

  return (
    <label className="flex w-full flex-col gap-1 sm:w-auto">
      <span className="text-xs font-bold uppercase text-text-muted">Torneo</span>
      <select
        value={torneoSeleccionado?.id ?? ''}
        onChange={(e) => {
          const t = torneos.find((x) => String(x.id) === e.target.value)
          seleccionar(t || null)
        }}
        className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 sm:w-64 transition-colors"
        aria-label="Selector de torneo"
      >
        {torneos.length === 0 && <option value="">Sin torneos</option>}
        {torneos.map((t) => (
          <option key={t.id} value={t.id}>
            {t.categoria} {t.edicion} · {t.temporada} {t.grupo ? `· ${t.grupo}` : ''}
          </option>
        ))}
      </select>
    </label>
  )
}