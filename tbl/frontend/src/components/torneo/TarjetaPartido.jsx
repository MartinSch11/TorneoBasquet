import { Link } from 'react-router-dom'
import { formatFecha, formatHorario } from '../../utils/formatFecha'
import { formatFase } from '../../utils/formatFase'
import EscudoEquipo from '../ui/EscudoEquipo'

export default function TarjetaPartido({ partido, jugado = undefined, mostrarBadge = false }) {
  const tienePuntosValidos =
    partido.pts_local !== null &&
    partido.pts_visitante !== null &&
    (partido.pts_local > 0 || partido.pts_visitante > 0)

  const yaJugado =
    jugado === true ||
    (jugado !== false && (Boolean(partido.jugado) || tienePuntosValidos))
  const localGano = yaJugado && (partido.pts_local ?? 0) > (partido.pts_visitante ?? 0)
  const visitGano = yaJugado && (partido.pts_visitante ?? 0) > (partido.pts_local ?? 0)
  const fechaStr = formatFecha(partido.fecha)
  const horaStr = partido.horario ? formatHorario(partido.horario) : null
  const faseFormateada = formatFase(partido.fase)

  const Wrapper = yaJugado && partido.id ? Link : 'article'

  return (
    <Wrapper
      to={yaJugado && partido.id ? `/partidos/${partido.id}` : undefined}
      data-ui="match-card"
      className="group block rounded-xl border border-border bg-surface p-3.5 sm:p-4 transition-colors duration-150 hover:border-orange-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    >
      {/* Cabecera del Partido */}
      <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-2.5 mb-2.5 text-xs text-text-muted">
        <div className="flex items-center gap-2 min-w-0">
          {mostrarBadge && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide ${
                yaJugado
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
              }`}
            >
              {yaJugado ? 'Finalizado' : 'Programado'}
            </span>
          )}
          <span className="font-semibold text-text truncate">{faseFormateada}</span>
        </div>

        <div className="text-right font-medium whitespace-nowrap shrink-0 text-xs tabular-nums text-text-muted">
          {fechaStr && <span>{fechaStr}</span>}
          {horaStr && (
            <span className="font-bold text-orange-600 dark:text-orange-400 ml-1.5">
              · {horaStr} hs
            </span>
          )}
        </div>
      </div>

      {/* Enfrentamiento y Marcador */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 sm:gap-4 py-1">
        {/* Equipo Local */}
        <div className="flex items-center gap-2.5 min-w-0">
          <EscudoEquipo
            url={partido.escudo_local}
            nombre={partido.equipo_local}
            className="w-9 h-9 sm:w-11 sm:h-11 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-text-muted">Local</span>
            <span
              className={`block truncate text-sm sm:text-base ${
                localGano ? 'font-bold text-text' : 'font-medium text-text-muted'
              }`}
              title={partido.equipo_local}
            >
              {partido.equipo_local}
            </span>
          </div>
        </div>

        {/* Tablero / Marcador Central */}
        <div className="flex flex-col items-center justify-center px-2 shrink-0">
          {yaJugado ? (
            <div className="flex items-center gap-2 font-athletic text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums">
              <span className={localGano ? 'text-orange-600 dark:text-orange-400' : 'text-text-muted'}>
                {partido.pts_local ?? 0}
              </span>
              <span className="text-border font-light">-</span>
              <span className={visitGano ? 'text-orange-600 dark:text-orange-400' : 'text-text-muted'}>
                {partido.pts_visitante ?? 0}
              </span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400 font-athletic font-bold text-xs sm:text-sm tracking-wider">
              VS
            </div>
          )}
        </div>

        {/* Equipo Visitante */}
        <div className="flex items-center justify-end gap-2.5 min-w-0 text-right">
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-text-muted">Visita</span>
            <span
              className={`block truncate text-sm sm:text-base ${
                visitGano ? 'font-bold text-text' : 'font-medium text-text-muted'
              }`}
              title={partido.equipo_visitante}
            >
              {partido.equipo_visitante}
            </span>
          </div>
          <EscudoEquipo
            url={partido.escudo_visitante}
            nombre={partido.equipo_visitante}
            className="w-9 h-9 sm:w-11 sm:h-11 shrink-0"
          />
        </div>
      </div>

      {/* Pie con Cancha o Enlace a Planilla */}
      {(partido.cancha || partido.numero_fecha || yaJugado) && (
        <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-page flex items-center justify-between gap-2 text-xs text-text-muted">
          <span className="truncate">
            {partido.cancha ? (
              <>
                <strong className="font-semibold text-text/80">Cancha:</strong> {partido.cancha}
              </>
            ) : partido.numero_fecha ? (
              <span className="font-semibold uppercase tabular-nums">
                Fecha {partido.numero_fecha}
              </span>
            ) : (
              <span>Resultado oficial</span>
            )}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {partido.cancha && partido.numero_fecha && (
              <span className="font-semibold uppercase tabular-nums text-text-muted">
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
