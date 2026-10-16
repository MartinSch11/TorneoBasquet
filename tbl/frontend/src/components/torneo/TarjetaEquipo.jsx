import { Link } from 'react-router-dom'
import EscudoEquipo from '../ui/EscudoEquipo'

export default function TarjetaEquipo({ equipo }) {
  return (
    <Link
      to={`/equipos/${equipo.id}`}
      className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-5 text-center hover:border-orange-500/50 hover:bg-surface-raised transition-[transform,border-color,background-color] duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    >
      <EscudoEquipo
        url={equipo.escudo_url}
        nombre={equipo.nombre}
        className="h-16 w-16"
      />
      <div className="w-full">
        <span className="block text-sm font-bold text-text group-hover:text-orange-500 transition-colors truncate">
          {equipo.nombre}
        </span>
        <span className="block text-[11px] font-medium text-text-muted mt-0.5">
          Ver equipo →
        </span>
      </div>
    </Link>
  )
}