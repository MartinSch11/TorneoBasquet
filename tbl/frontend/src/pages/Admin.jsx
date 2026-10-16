import { useState } from 'react'
import GestionPartidos from '../components/admin/GestionPartidos'
import GestionTorneos from '../components/admin/GestionTorneos'
import GestionEquipos from '../components/admin/GestionEquipos'
import GestionCanchas from '../components/admin/GestionCanchas'
import GestionUsuarios from '../components/admin/GestionUsuarios'
import GestionSponsors from '../components/admin/GestionSponsors'

export default function Admin() {
  const [tab, setTab] = useState('partidos')
  const [torneoAdmin, setTorneoAdmin] = useState(null)

  const tabs = [
    { id: 'partidos', label: 'Planillas y Partidos' },
    { id: 'torneos', label: 'Torneos y Categorías' },
    { id: 'equipos', label: 'Equipos y Planteles' },
    { id: 'canchas', label: 'Canchas y Sedes' },
    { id: 'usuarios', label: 'Usuarios' },
    { id: 'sponsors', label: 'Sponsors' },
  ]

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
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors duration-150 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              tab === t.id
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
        {tab === 'partidos' && (
          <GestionPartidos
            initialTorneoId={torneoAdmin}
            onTorneoChange={setTorneoAdmin}
          />
        )}
        {tab === 'torneos' && <GestionTorneos />}
        {tab === 'equipos' && <GestionEquipos />}
        {tab === 'canchas' && <GestionCanchas />}
        {tab === 'usuarios' && <GestionUsuarios />}
        {tab === 'sponsors' && <GestionSponsors />}
      </div>
    </section>
  )
}