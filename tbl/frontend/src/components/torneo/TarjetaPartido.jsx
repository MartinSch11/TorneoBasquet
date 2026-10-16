import { Link } from 'react-router-dom'
import { formatFecha, formatHorario } from '../../utils/formatFecha'
import EscudoEquipo from '../ui/EscudoEquipo'

export default function TarjetaPartido({ partido, jugado = undefined, mostrarBadge = false }) {
  const tienePuntosValidos =
    partido.pts_local !== null &&
    partido.pts_visitante !== null &&
    (partido.pts_local > 0 || partido.pts_visitante > 0)

  const yaJugado =
    jugado === true ||
    (jugado !== false && (Boolean(partido.jugado) || tienePuntosValidos))
  const localGano = yaJugado && partido.pts_local > partido.pts_visitante
  const visitGano = yaJugado && partido.pts_visitante > partido.pts_local
  const fechaStr = formatFecha(partido.fecha)
  const horaStr = partido.horario ? formatHorario(partido.horario) : null

  const faseFormateada =
    partido.fase && (partido.fase.toUpperCase().includes('PROMOCION') || partido.fase.toUpperCase().includes('DESCENSO'))
      ? 'PROMOCIÓN'
      : (partido.fase || 'Fase Regular')

  const Wrapper = yaJugado && partido.id ? Link : 'article'

  return (
    <Wrapper
      to={yaJugado && partido.id ? `/partidos/${partido.id}` : undefined}
      data-ui="card"
      className="group relative flex flex-col justify-between rounded-2xl border border-border bg-surface p-3.5 sm:p-4 hover:border-orange-500/60 hover:bg-surface-raised/40 transition-[border-color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    >
      {/* Cabecera del Partido */}
      <div data-ui="card-header" className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 mb-2.5 text-[11px] font-semibold uppercase text-text-muted">
        <div className="flex items-center gap-2 min-w-0">
          {mostrarBadge && (
            yaJugado ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60">
                Finalizado
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60">
                Programado
              </span>
            )
          )}
          <span className="truncate">{faseFormateada}</span>
        </div>

        <div className="text-right font-medium whitespace-nowrap shrink-0 text-[11px] tabular-nums">
          {fechaStr && <span>{fechaStr}</span>}
          {horaStr && <span className="text-orange-600 dark:text-orange-400 font-bold ml-1.5">· {horaStr} hs</span>}
        </div>
      </div>

      {/* Enfrentamiento y Marcador */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3 my-1">
        {/* Equipo Local */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <EscudoEquipo url={partido.escudo_local} nombre={partido.equipo_local} className="w-8 h-8 sm:w-10 sm:h-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] sm:text-[10px] font-bold uppercase text-text-muted">Local</span>
            <span
              className={`block truncate text-xs sm:text-base ${
                localGano ? 'font-bold text-text' : 'font-medium text-text-muted'
              }`}
              title={partido.equipo_local}
            >
              {partido.equipo_local}
            </span>
          </div>
        </div>

        {/* Tablero / Marcador Central */}
        <div className="flex flex-col items-center justify-center px-1.5 sm:px-2 shrink-0">
          {yaJugado ? (
            <div className="flex items-center gap-1.5 sm:gap-2 font-athletic text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums">
              <span className={localGano ? 'text-orange-600 dark:text-orange-400' : 'text-text-muted font-semibold'}>
                {partido.pts_local ?? 0}
              </span>
              <span className="text-border text-lg sm:text-xl font-light">-</span>
              <span className={visitGano ? 'text-orange-600 dark:text-orange-400' : 'text-text-muted font-semibold'}>
                {partido.pts_visitante ?? 0}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg bg-orange-100 dark:bg-orange-950/50 border border-orange-300 dark:border-orange-800/60 text-orange-700 dark:text-orange-400 font-athletic font-bold text-xs sm:text-sm">
              VS
            </div>
          )}
        </div>

        {/* Equipo Visitante */}
        <div className="flex items-center justify-end gap-2 sm:gap-2.5 min-w-0 text-right">
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] sm:text-[10px] font-bold uppercase text-text-muted">Visita</span>
            <span
              className={`block truncate text-xs sm:text-base ${
                visitGano ? 'font-bold text-text' : 'font-medium text-text-muted'
              }`}
              title={partido.equipo_visitante}
            >
              {partido.equipo_visitante}
            </span>
          </div>
          <EscudoEquipo url={partido.escudo_visitante} nombre={partido.equipo_visitante} className="w-8 h-8 sm:w-10 sm:h-10 shrink-0" />
        </div>
      </div>

      {/* Pie con Cancha o Enlace a Planilla */}
      {(partido.cancha || partido.numero_fecha || yaJugado) && (
        <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-surface-raised/60 flex items-center justify-between gap-2 text-[11px] text-text-muted">
          <span className="truncate">
            {partido.cancha ? (
              <>
                <strong className="font-semibold text-text/80">Cancha:</strong> {partido.cancha}
              </>
            ) : partido.numero_fecha ? (
              <span className="text-[10px] uppercase font-bold tabular-nums text-text-muted">
                Fecha {partido.numero_fecha}
              </span>
            ) : (
              <span>Resultado oficial</span>
            )}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {partido.cancha && partido.numero_fecha && (
              <span className="text-[10px] uppercase font-bold tabular-nums text-text-muted">
                Fecha {partido.numero_fecha}
              </span>
            )}
            {yaJugado && partido.id && (
              <span className="font-bold text-orange-600 dark:text-orange-400 group-hover:underline">
                Ver planilla ›
              </span>
            )}
          </div>
        </div>
      )}
    </Wrapper>
  )
}