import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import GestionPartidos from '../components/admin/GestionPartidos'
import GestionTorneos from '../components/admin/GestionTorneos'
import GestionEquipos from '../components/admin/GestionEquipos'
import GestionCanchas from '../components/admin/GestionCanchas'
import GestionUsuarios from '../components/admin/GestionUsuarios'
import GestionSponsors from '../components/admin/GestionSponsors'

const TABS = [
  { id: 'partidos', label: 'Planillas y Partidos' },
  { id: 'torneos', label: 'Torneos y Categorías' },
  { id: 'equipos', label: 'Equipos y Planteles' },
  { id: 'canchas', label: 'Canchas y Sedes' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'sponsors', label: 'Sponsors' },
]

const VALID_TAB_IDS = TABS.map((t) => t.id)
const STORAGE_TAB_KEY = 'tbl_admin_tab'
const STORAGE_TORNEO_KEY = 'tbl_admin_torneo'

export default function Admin() {
  const [searchParams, setSearchParams] = useSearchParams()

  const tabParam = searchParams.get('tab')

  // Pestaña activa calculada a partir de query params o fallback de localStorage
  const activeTab = useMemo(() => {
    if (tabParam && VALID_TAB_IDS.includes(tabParam)) {
      return tabParam
    }
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_TAB_KEY) : null
    if (saved && VALID_TAB_IDS.includes(saved)) {
      return saved
    }
    return 'partidos'
  }, [tabParam])

  // Torneo seleccionado para mantener consistencia en reload
  const [torneoAdmin, setTorneoAdmin] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem(STORAGE_TORNEO_KEY) : null
  })

  // Sincronizar URL cuando no hay parámetro ?tab o cuando activeTab no coincide
  useEffect(() => {
    if (!tabParam || !VALID_TAB_IDS.includes(tabParam)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('tab', activeTab)
          return next
        },
        { replace: true }
      )
    }
  }, [tabParam, activeTab, setSearchParams])

  const handleSelectTab = useCallback(
    (newTabId) => {
      try {
        localStorage.setItem(STORAGE_TAB_KEY, newTabId)
      } catch {
        // ignore
      }
      setSearchParams({ tab: newTabId })
    },
    [setSearchParams]
  )

  const handleTorneoChange = useCallback((newTorneoId) => {
    setTorneoAdmin(newTorneoId)
    if (newTorneoId) {
      try {
        localStorage.setItem(STORAGE_TORNEO_KEY, String(newTorneoId))
      } catch {
        // ignore
      }
    }
  }, [])

  return (
    <section className="mx-auto max-w-6xl px-4 py-4">
      <div className="mb-4 flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-text text-balance">
          Panel de Administración
        </h1>
        <p className="text-xs text-text-muted text-pretty">
          Gestión de planillas de juego, fixture, torneos, equipos, canchas, usuarios y auspiciantes.
        </p>
      </div>

      {/* Navegación por Pestañas Estilizadas */}
      <nav data-ui="admin-tabs" className="mb-5 flex flex-wrap gap-2 border-b border-border pb-3" aria-label="Pestañas de administración">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => handleSelectTab(t.id)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors duration-150 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              activeTab === t.id
                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                : 'border-border bg-surface text-text-muted hover:text-text hover:border-orange-500/40'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Contenido según la pestaña activa */}
      <div className="flex flex-col gap-4">
        {activeTab === 'partidos' && (
          <GestionPartidos
            initialTorneoId={torneoAdmin}
            onTorneoChange={handleTorneoChange}
          />
        )}
        {activeTab === 'torneos' && <GestionTorneos />}
        {activeTab === 'equipos' && <GestionEquipos />}
        {activeTab === 'canchas' && <GestionCanchas />}
        {activeTab === 'usuarios' && <GestionUsuarios />}
        {activeTab === 'sponsors' && <GestionSponsors />}
      </div>
    </section>
  )
}