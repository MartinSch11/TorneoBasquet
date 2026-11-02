import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '../ui/Icon'
import EscudoEquipo from '../ui/EscudoEquipo'
import useBodyLock from '../../hooks/useBodyLock'
import { formatFecha } from '../../utils/formatFecha'

export default function TarjetaJugadorModal({
  isOpen,
  onClose,
  jugador,
  stats = {},
  equipoNombre = 'Equipo',
  escudoEquipo,
  partido,
  esMvp = false,
}) {
  useBodyLock(isOpen)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen || !jugador) return null

  const pts = stats.puntos || 0
  const triples = stats.triples || 0
  const dobles = stats.dobles || 0
  const rebotes = stats.rebotes || 0
  const asistencias = stats.asistencias || 0
  const robos = stats.robos || 0

  const ptsLocal = partido?.pts_local ?? '-'
  const ptsVisitante = partido?.pts_visitante ?? '-'
  const localGano = Number(ptsLocal) > Number(ptsVisitante)
  const visitGano = Number(ptsVisitante) > Number(ptsLocal)

  return createPortal(
    <div
      data-ui="modal"
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 p-4 touch-none overscroll-contain animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Tarjeta de estadísticas de ${jugador.nombre}`}
    >
      {/* Botón flotante de cierre */}
      <button
        type="button"
        onClick={onClose}
        className="fixed top-4 right-4 z-[1000001] grid h-10 w-10 place-items-center rounded-full bg-surface border border-border text-text hover:border-orange-500 active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        aria-label="Cerrar tarjeta"
      >
        <IconClose className="w-5 h-5" />
      </button>

      {/* TARJETA DEPORTIVA (Borde nítido sin halo de sombra escalonada) */}
      <div
        data-ui="player-card"
        className="relative w-full max-w-[340px] sm:max-w-[360px] rounded-2xl border-2 border-orange-500/50 bg-surface text-text p-5 flex flex-col gap-4 overflow-hidden select-none touch-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fondo: Trazado de cancha de básquet (SVG watermark) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06] dark:opacity-[0.07] text-text select-none"
          viewBox="0 0 360 640"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="180" cy="140" r="90" />
          <path d="M90 0v140h180V0" />
          <circle cx="180" cy="500" r="90" />
          <path d="M90 640V500h180v140" />
          <line x1="0" y1="320" x2="360" y2="320" />
        </svg>

        {/* 1. CABECERA: Liga, Fecha y Marcador */}
        <div className="relative z-10 flex flex-col gap-2">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-1.5">
              <span className="font-athletic font-extrabold text-xs text-orange-600 dark:text-orange-400">
                LBA BASKETBALL
              </span>
              <span className="text-border">·</span>
              <span className="text-xs font-semibold text-text-muted">
                {partido?.categoria || 'Oficial'}
              </span>
            </div>
            {partido?.numero_fecha ? (
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded">
                FECHA {partido.numero_fecha}
              </span>
            ) : (
              <span className="text-xs font-bold text-text-muted">
                Temporada 2026
              </span>
            )}
          </div>

          {/* Marcador del partido */}
          {partido && (
            <div data-ui="match-ticker" className="flex items-center justify-between bg-page border border-border/70 rounded-xl px-3 py-1.5">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <EscudoEquipo
                  url={partido.escudo_local}
                  nombre={partido.equipo_local}
                  className="w-5 h-5 shrink-0"
                />
                <span className={`font-display text-xs truncate ${localGano ? 'text-text font-black' : 'text-text-muted font-bold'}`}>
                  {partido.equipo_local}
                </span>
              </div>
              <div className="flex items-center gap-1 px-2 font-athletic font-black text-sm tabular-nums shrink-0">
                <span className={localGano ? 'text-orange-600 dark:text-orange-400' : 'text-text-muted'}>{ptsLocal}</span>
                <span className="text-border text-xs">-</span>
                <span className={visitGano ? 'text-orange-600 dark:text-orange-400' : 'text-text-muted'}>{ptsVisitante}</span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                <span className={`font-display text-xs truncate text-right ${visitGano ? 'text-text font-black' : 'text-text-muted font-bold'}`}>
                  {partido.equipo_visitante}
                </span>
                <EscudoEquipo
                  url={partido.escudo_visitante}
                  nombre={partido.equipo_visitante}
                  className="w-5 h-5 shrink-0"
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. IDENTIDAD DEL JUGADOR Y PUNTOS */}
        <div className="relative z-10 flex flex-col items-center text-center py-1">
          {/* Escudo del equipo con número */}
          <div className="relative mb-2">
            <EscudoEquipo
              url={escudoEquipo}
              nombre={equipoNombre}
              className="w-16 h-16 sm:w-20 sm:h-20"
            />
            {jugador.numero !== null && jugador.numero !== undefined && (
              <span className="absolute -bottom-1 -right-1 font-athletic font-extrabold text-xs px-2 py-0.5 rounded-full bg-orange-500 text-black border border-white/20">
                #{jugador.numero}
              </span>
            )}
          </div>

          {/* Badge MVP exclusivo para la figura del partido */}
          {esMvp && (
            <span className="inline-flex items-center gap-1 font-display font-extrabold text-xs uppercase px-2.5 py-0.5 rounded-full bg-orange-500 text-black mb-1.5">
              <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span>MVP</span>
            </span>
          )}

          {/* Nombre y equipo */}
          <h2 className="font-display font-extrabold text-2xl uppercase tracking-wide text-text leading-tight px-2 text-balance">
            {jugador.nombre}
          </h2>
          <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mt-0.5 truncate max-w-[280px]">
            {equipoNombre}
          </p>

          {/* Puntaje gigante */}
          <div className="mt-2.5 flex flex-col items-center">
            <div className="font-athletic font-black text-6xl sm:text-7xl text-orange-600 dark:text-orange-400 leading-none tracking-tight tabular-nums">
              {pts}
            </div>
            <div className="font-display font-bold text-xs uppercase text-text-muted mt-1">
              Puntos anotados
            </div>
          </div>
        </div>

        {/* 3. GRILLA DE 4 ESTADÍSTICAS */}
        <div data-ui="stats-grid" className="relative z-10 grid grid-cols-4 gap-2">
          {/* Triples */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-page border border-border/70 text-center">
            <span className="font-athletic font-black text-base sm:text-lg text-text tabular-nums leading-none">
              {triples}
            </span>
            <span className="text-[11px] font-bold text-text-muted uppercase mt-1">
              3P
            </span>
          </div>

          {/* Dobles / 2P */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-page border border-border/70 text-center">
            <span className="font-athletic font-black text-base sm:text-lg text-text tabular-nums leading-none">
              {dobles}
            </span>
            <span className="text-[11px] font-bold text-text-muted uppercase mt-1">
              2P
            </span>
          </div>

          {/* Rebotes */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-page border border-border/70 text-center">
            <span className="font-athletic font-black text-base sm:text-lg text-text tabular-nums leading-none">
              {rebotes}
            </span>
            <span className="text-[11px] font-bold text-text-muted uppercase mt-1">
              REB
            </span>
          </div>

          {/* Asistencias o Robos */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-page border border-border/70 text-center">
            <span className="font-athletic font-black text-base sm:text-lg text-text tabular-nums leading-none">
              {asistencias > 0 ? asistencias : robos}
            </span>
            <span className="text-[11px] font-bold text-text-muted uppercase mt-1">
              {asistencias > 0 ? 'AST' : 'ROB'}
            </span>
          </div>
        </div>

        {/* 4. PIE DE TARJETA: Watermark y Fecha */}
        <div className="relative z-10 pt-1 flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-1 font-medium">
            <span>torneobasquet.com</span>
          </div>
          <div className="font-medium">
            {partido?.fecha ? formatFecha(partido.fecha) : 'Torneo Oficial'}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
