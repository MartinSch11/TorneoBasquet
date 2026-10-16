import { useMemo, useState } from 'react'
import { useTorneo } from '../hooks/useTorneo'
import { useApi } from '../hooks/useApi'
import api from '../services/api'
import TorneoSelector from '../components/ui/TorneoSelector'
import TablaOrdenable from '../components/ui/TablaOrdenable'
import Spinner from '../components/ui/Spinner'
import SelectorMetrica, { METRICAS_EQUIPOS } from '../components/ui/SelectorMetrica'
import { IconSearch, IconClose } from '../components/ui/Icon'
import EscudoEquipo from '../components/ui/EscudoEquipo'

function pct(conv, intent) {
  if (!intent) return '0.00%'
  return `${((conv / intent) * 100).toFixed(2)}%`
}

export default function EstadisticasEquipos() {
  const { torneoSeleccionado } = useTorneo()
  const [metrica, setMetrica] = useState('puntos')
  const [busqueda, setBusqueda] = useState('')
  const { data, loading, error } = useApi(
    async () => {
      if (!torneoSeleccionado) return []
      const res = await api.get(`/estadisticas/equipos?torneo_id=${torneoSeleccionado.id}&metrica=${metrica}`)
      return res.data
    },
    [torneoSeleccionado?.id, metrica],
  )

  const renderEquipo = (f) => (
    <div className="flex items-center gap-2.5 min-w-0">
      <EscudoEquipo url={f.escudo_url} nombre={f.equipo} className="w-6 h-6 shrink-0" />
      <span className="font-semibold text-text truncate">{f.equipo}</span>
    </div>
  )

  const columnasMap = {
    puntos: [
      { key: 'posicion', label: '#', sortable: true, render: (f) => <span className="font-athletic font-bold text-orange-600 dark:text-orange-400">{f.posicion}</span> },
      { key: 'equipo', label: 'Equipo', sortable: true, render: renderEquipo },
      { key: 'pj', label: 'PJ', sortable: true },
      { key: 'pc', label: 'PC', sortable: true, render: (f) => <span className="font-extrabold font-athletic text-base text-orange-600 dark:text-orange-400">{f.pc}</span> },
      { key: 'pr', label: 'PR', sortable: true },
      { key: 'dif', label: 'DIF', sortable: true, render: (f) => <span className={f.dif > 0 ? 'text-emerald-700 dark:text-emerald-400 font-bold' : f.dif < 0 ? 'text-rose-700 dark:text-rose-400 font-bold' : 'text-slate-500 dark:text-slate-400 font-medium'}>{f.dif > 0 ? `+${f.dif}` : f.dif}</span> },
    ],
    efectividad: [
      { key: 'posicion', label: '#', sortable: true, render: (f) => <span className="font-athletic font-bold text-orange-600 dark:text-orange-400">{f.posicion}</span> },
      { key: 'equipo', label: 'Equipo', sortable: true, render: renderEquipo },
      { key: 'pj', label: 'PJ', sortable: true },
      { key: 'libres_conv', label: '1C', sortable: true },
      { key: 'libres_int', label: '1I', sortable: true },
      { key: 'libres_pct', label: '1%', sortable: true },
      { key: 'dobles_conv', label: '2C', sortable: true },
      { key: 'dobles_int', label: '2I', sortable: true },
      { key: 'dobles_pct', label: '2%', sortable: true },
      { key: 'triples_conv', label: '3C', sortable: true },
      { key: 'triples_int', label: '3I', sortable: true },
      { key: 'triples_pct', label: '3%', sortable: true },
    ],
    asistencias: [
      { key: 'posicion', label: '#', sortable: true, render: (f) => <span className="font-athletic font-bold text-orange-600 dark:text-orange-400">{f.posicion}</span> },
      { key: 'equipo', label: 'Equipo', sortable: true, render: renderEquipo },
      { key: 'pj', label: 'PJ', sortable: true },
      { key: 'asistencias', label: 'Asistencias', sortable: true, render: (f) => <span className="font-extrabold font-athletic text-base text-orange-600 dark:text-orange-400">{f.asistencias}</span> },
    ],
    rebotes: [
      { key: 'posicion', label: '#', sortable: true, render: (f) => <span className="font-athletic font-bold text-orange-600 dark:text-orange-400">{f.posicion}</span> },
      { key: 'equipo', label: 'Equipo', sortable: true, render: renderEquipo },
      { key: 'pj', label: 'PJ', sortable: true },
      { key: 'ro', label: 'Ofensivos', sortable: true },
      { key: 'rd', label: 'Defensivos', sortable: true },
      { key: 'rebotes', label: 'Tot Rebotes', sortable: true, render: (f) => <span className="font-extrabold font-athletic text-base text-orange-600 dark:text-orange-400">{f.rebotes}</span> },
    ],
    recuperos: [
      { key: 'posicion', label: '#', sortable: true, render: (f) => <span className="font-athletic font-bold text-orange-600 dark:text-orange-400">{f.posicion}</span> },
      { key: 'equipo', label: 'Equipo', sortable: true, render: renderEquipo },
      { key: 'pj', label: 'PJ', sortable: true },
      { key: 'recuperos', label: 'Recuperos', sortable: true, render: (f) => <span className="font-extrabold font-athletic text-base text-orange-600 dark:text-orange-400">{f.recuperos}</span> },
    ],
    perdidas: [
      { key: 'posicion', label: '#', sortable: true, render: (f) => <span className="font-athletic font-bold text-orange-600 dark:text-orange-400">{f.posicion}</span> },
      { key: 'equipo', label: 'Equipo', sortable: true, render: renderEquipo },
      { key: 'pj', label: 'PJ', sortable: true },
      { key: 'perdidas', label: 'Pérdidas', sortable: true, render: (f) => <span className="font-extrabold font-athletic text-base text-orange-600 dark:text-orange-400">{f.perdidas}</span> },
    ],
    faltas: [
      { key: 'posicion', label: '#', sortable: true, render: (f) => <span className="font-athletic font-bold text-orange-600 dark:text-orange-400">{f.posicion}</span> },
      { key: 'equipo', label: 'Equipo', sortable: true, render: renderEquipo },
      { key: 'pj', label: 'PJ', sortable: true },
      { key: 'faltas_personales', label: 'FP', sortable: true },
      { key: 'faltas_recibidas', label: 'FR', sortable: true },
      { key: 'faltas_tecnicas', label: 'FT', sortable: true },
      { key: 'faltas_antideportivas', label: 'FA', sortable: true },
      { key: 'faltas_totales', label: 'Tot Faltas', sortable: true, render: (f) => <span className="font-extrabold font-athletic text-base text-orange-600 dark:text-orange-400">{f.faltas_totales}</span> },
    ],
    bloqueos: [
      { key: 'posicion', label: '#', sortable: true, render: (f) => <span className="font-athletic font-bold text-orange-600 dark:text-orange-400">{f.posicion}</span> },
      { key: 'equipo', label: 'Equipo', sortable: true, render: renderEquipo },
      { key: 'pj', label: 'PJ', sortable: true },
      { key: 'bloqueos', label: 'Bloqueos', sortable: true, render: (f) => <span className="font-extrabold font-athletic text-base text-orange-600 dark:text-orange-400">{f.bloqueos}</span> },
    ],
    valoracion: [
      { key: 'posicion', label: '#', sortable: true, render: (f) => <span className="font-athletic font-bold text-orange-600 dark:text-orange-400">{f.posicion}</span> },
      { key: 'equipo', label: 'Equipo', sortable: true, render: renderEquipo },
      { key: 'pj', label: 'PJ', sortable: true },
      { key: 'valoracion', label: 'Valoración', sortable: true, render: (f) => <span className="font-extrabold font-athletic text-base text-orange-600 dark:text-orange-400">{f.valoracion}</span> },
    ],
  }

  const columnas = columnasMap[metrica] || columnasMap.puntos

  const filas = useMemo(
    () => (data || []).map((e, i) => {
      const lc = e.tiros?.libres?.conv ?? 0
      const li = e.tiros?.libres?.int ?? 0
      const dc = e.tiros?.dobles?.conv ?? 0
      const di = e.tiros?.dobles?.int ?? 0
      const tc = e.tiros?.triples?.conv ?? 0
      const ti = e.tiros?.triples?.int ?? 0

      return {
        ...e,
        posicion: i + 1,
        libres_conv: lc,
        libres_int: li,
        libres_pct: pct(lc, li),
        dobles_conv: dc,
        dobles_int: di,
        dobles_pct: pct(dc, di),
        triples_conv: tc,
        triples_int: ti,
        triples_pct: pct(tc, ti),
        ro: e.ro ?? 0,
        rd: e.rd ?? 0,
        rebotes: e.rebotes ?? 0,
        asistencias: e.asistencias ?? 0,
        recuperos: e.recuperos ?? 0,
        perdidas: e.perdidas ?? 0,
        faltas_personales: e.faltas_personales ?? 0,
        faltas_recibidas: e.faltas_recibidas ?? 0,
        faltas_tecnicas: e.faltas_tecnicas ?? 0,
        faltas_antideportivas: e.faltas_antideportivas ?? 0,
        faltas_totales: e.faltas_totales ?? e.faltas ?? 0,
        bloqueos: e.bloqueos ?? 0,
        valoracion: e.valoracion ?? 0,
      }
    }),
    [data],
  )

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
    return filas.filter((f) => f.equipo && normalizarTexto(f.equipo).includes(q))
  }, [filas, busqueda])

  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text text-balance">Estadísticas por Equipo</h1>
          <p className="text-sm text-text-muted text-pretty">Comparación de métricas entre equipos</p>
        </div>
        <TorneoSelector />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SelectorMetrica metrica={metrica} setMetrica={setMetrica} list={METRICAS_EQUIPOS} />
        <div className="relative w-full sm:w-64 shrink-0">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            name="busqueda"
            aria-label="Buscar equipo"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar equipo…"
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

      {loading && <Spinner label="Cargando estadísticas…" />}
      {error && <p className="rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-danger">{error}</p>}
      {!loading && !error && (
        <TablaOrdenable
          columns={columnas}
          data={filasFiltradas}
          ordenInicial={['posicion']}
          rowKey="equipo_id"
          itemLabel="equipos"
        />
      )}
    </section>
  )
}