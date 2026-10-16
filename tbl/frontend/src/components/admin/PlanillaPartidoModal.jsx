import { useEffect, useState, useMemo, useCallback } from 'react'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'
import ModalInscribirJugador from './ModalInscribirJugador'
import EscudoEquipo from '../ui/EscudoEquipo'
import api from '../../services/api'
import { formatFecha, formatHorario } from '../../utils/formatFecha'


// — Bloquea teclas no numéricas en inputs de estadísticas —
const blockNonNumeric = (e) => {
  if (['-', 'e', 'E', '+', '.'].includes(e.key)) e.preventDefault()
}

export default function PlanillaPartidoModal({ partido, onClose, onSaved }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Equipo activo en vista de planilla: 'local' | 'visitante'
  const [equipoActivo, setEquipoActivo] = useState('local')

  // Modo de marcador manual o automático (sincronizado con la planilla)
  const [marcadorManualLocal, setMarcadorManualLocal] = useState(false)
  const [marcadorManualVisitante, setMarcadorManualVisitante] = useState(false)
  const [ptsLocalManual, setPtsLocalManual] = useState('')
  const [ptsVisitanteManual, setPtsVisitanteManual] = useState('')

  // Planteles y escudos
  const [jugadoresLocal, setJugadoresLocal] = useState([])
  const [jugadoresVisitante, setJugadoresVisitante] = useState([])
  const [escudoLocal, setEscudoLocal] = useState(partido?.escudo_local || '')
  const [escudoVisitante, setEscudoVisitante] = useState(partido?.escudo_visitante || '')

  // Datos de planilla por jugador
  const [stats, setStats] = useState({})

  // Modal de inscripción de jugador
  const [modalJugadorAbierto, setModalJugadorAbierto] = useState(false)
  const [equipoDestinoModal, setEquipoDestinoModal] = useState('local')

  const abrirModalInscribir = (equipo = equipoActivo) => {
    setEquipoDestinoModal(equipo)
    setModalJugadorAbierto(true)
  }

  const handleJugadorCreado = (nuevoJugador, targetEquipoId) => {
    if (String(targetEquipoId) === String(partido.equipo_local_id)) {
      setJugadoresLocal((prev) => [...prev, nuevoJugador])
    } else {
      setJugadoresVisitante((prev) => [...prev, nuevoJugador])
    }
  }

  // Confirmación de cierre sin guardar
  const [confirmarCierre, setConfirmarCierre] = useState(false)

  // Cargar datos del partido y planteles
  useEffect(() => {
    async function init() {
      try {
        setLoading(true)
        setError('')

        const [resLocal, resVisit, resStats] = await Promise.all([
          partido.equipo_local_id
            ? api.get(`/equipos/${partido.equipo_local_id}`)
            : Promise.resolve({ data: { jugadores: [] } }),
          partido.equipo_visitante_id
            ? api.get(`/equipos/${partido.equipo_visitante_id}`)
            : Promise.resolve({ data: { jugadores: [] } }),
          api.get(`/partidos/${partido.id}/estadisticas`),
        ])

        setJugadoresLocal(resLocal.data.jugadores || [])
        setJugadoresVisitante(resVisit.data.jugadores || [])
        setEscudoLocal(partido.escudo_local || resLocal.data?.escudo_url || '')
        setEscudoVisitante(partido.escudo_visitante || resVisit.data?.escudo_url || '')

        const mapa = {}
        for (const st of resStats.data) {
          const triples = st.triples_conv || 0
          const dobles = st.dobles_conv || 0
          const libres = st.libres_conv || 0
          const puntos = st.puntos ?? (libres * 1 + dobles * 2 + triples * 3)

          mapa[st.jugador_id] = {
            libres,
            dobles,
            triples,
            puntos: puntos || libres * 1 + dobles * 2 + triples * 3,
            rebotes: (st.reb_defensivos || 0) + (st.reb_ofensivos || 0),
            asistencias: st.asistencias || 0,
            robos: st.recuperos || 0,
            bloqueos: st.bloqueos || 0,
            perdidas: st.perdidas || 0,
            faltas: st.faltas_personales || 0,
          }
        }
        setStats(mapa)

        let sumaIniLoc = 0
        let sumaIniVis = 0
        for (const j of resLocal.data.jugadores || []) {
          sumaIniLoc += mapa[j.id]?.puntos || 0
        }
        for (const j of resVisit.data.jugadores || []) {
          sumaIniVis += mapa[j.id]?.puntos || 0
        }

        const scoreLocalExiste = partido.pts_local !== null && partido.pts_local !== undefined && partido.pts_local > 0
        const scoreVisitExiste = partido.pts_visitante !== null && partido.pts_visitante !== undefined && partido.pts_visitante > 0

        if (scoreLocalExiste && partido.pts_local !== sumaIniLoc) {
          setMarcadorManualLocal(true)
          setPtsLocalManual(String(partido.pts_local))
        } else {
          setMarcadorManualLocal(false)
          setPtsLocalManual('')
        }

        if (scoreVisitExiste && partido.pts_visitante !== sumaIniVis) {
          setMarcadorManualVisitante(true)
          setPtsVisitanteManual(String(partido.pts_visitante))
        } else {
          setMarcadorManualVisitante(false)
          setPtsVisitanteManual('')
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Error al cargar la planilla')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [partido])

  // Getters y setters de estadísticas
  const getStat = (id, campo) => {
    const val = stats[id]?.[campo]
    return val === 0 ? '' : (val ?? '')
  }

  const handleStatChange = (id, campo, rawVal) => {
    const num = rawVal === '' ? 0 : Math.max(0, parseInt(rawVal, 10) || 0)
    setStats((prev) => {
      const actual = prev[id] || {
        libres: 0, dobles: 0, triples: 0, puntos: 0,
        rebotes: 0, asistencias: 0, robos: 0, bloqueos: 0, perdidas: 0, faltas: 0,
      }
      const updated = { ...actual }

      if (campo === 'libres') {
        updated.libres = num
        updated.puntos = updated.libres * 1 + (updated.dobles || 0) * 2 + (updated.triples || 0) * 3
      } else if (campo === 'dobles') {
        updated.dobles = num
        updated.puntos = (updated.libres || 0) * 1 + updated.dobles * 2 + (updated.triples || 0) * 3
      } else if (campo === 'triples') {
        updated.triples = num
        updated.puntos = (updated.libres || 0) * 1 + (updated.dobles || 0) * 2 + updated.triples * 3
      } else if (campo === 'faltas') {
        updated.faltas = Math.min(5, num)
      } else {
        updated[campo] = num
      }

      return { ...prev, [id]: updated }
    })
  }

  // Cálculos de suma de puntos
  const sumaLocal = useMemo(
    () => jugadoresLocal.reduce((acc, j) => acc + (stats[j.id]?.puntos || 0), 0),
    [jugadoresLocal, stats]
  )
  const sumaVisitante = useMemo(
    () => jugadoresVisitante.reduce((acc, j) => acc + (stats[j.id]?.puntos || 0), 0),
    [jugadoresVisitante, stats]
  )

  // Tanteador oficial: sincronizado en tiempo real con la suma salvo que se haya editado manualmente
  const ptsLocal = marcadorManualLocal ? ptsLocalManual : String(sumaLocal)
  const ptsVisitante = marcadorManualVisitante ? ptsVisitanteManual : String(sumaVisitante)

  // Modificación de marcador manual vs automático
  const handleCambioMarcadorLocal = (val) => {
    if (val === '') {
      setMarcadorManualLocal(false)
      setPtsLocalManual('')
    } else {
      setMarcadorManualLocal(true)
      setPtsLocalManual(val)
    }
  }

  const handleCambioMarcadorVisitante = (val) => {
    if (val === '') {
      setMarcadorManualVisitante(false)
      setPtsVisitanteManual('')
    } else {
      setMarcadorManualVisitante(true)
      setPtsVisitanteManual(val)
    }
  }

  const handleCopiarSumaActual = () => {
    if (esEquipoLocal) {
      setMarcadorManualLocal(false)
      setPtsLocalManual('')
    } else {
      setMarcadorManualVisitante(false)
      setPtsVisitanteManual('')
    }
  }

  // Progreso de carga por equipo
  const progresLocal = useMemo(
    () => jugadoresLocal.filter((j) => (stats[j.id]?.puntos || 0) > 0).length,
    [jugadoresLocal, stats]
  )
  const progresVisitante = useMemo(
    () => jugadoresVisitante.filter((j) => (stats[j.id]?.puntos || 0) > 0).length,
    [jugadoresVisitante, stats]
  )

  // Hay datos cargados (para confirmar cierre)
  const hayDatosCargados = useMemo(() => {
    const todos = [...jugadoresLocal, ...jugadoresVisitante]
    return todos.some((j) => {
      const s = stats[j.id]
      return s && Object.values(s).some((v) => v > 0)
    })
  }, [jugadoresLocal, jugadoresVisitante, stats])

  const scoreLocalNum = parseInt(ptsLocal, 10)
  const scoreVisitanteNum = parseInt(ptsVisitante, 10)

  const localTieneDatos = !isNaN(scoreLocalNum) && scoreLocalNum > 0
  const visitanteTieneDatos = !isNaN(scoreVisitanteNum) && scoreVisitanteNum > 0

  const localValido = !isNaN(scoreLocalNum) && scoreLocalNum >= 0
  const visitanteValido = !isNaN(scoreVisitanteNum) && scoreVisitanteNum >= 0

  const localCoincide = localValido && scoreLocalNum === sumaLocal
  const visitanteCoincide = visitanteValido && scoreVisitanteNum === sumaVisitante

  const esPartidoEnBlanco =
    scoreLocalNum === 0 &&
    scoreVisitanteNum === 0 &&
    sumaLocal === 0 &&
    sumaVisitante === 0

  const esSoloMarcadorGlobal =
    sumaLocal === 0 &&
    sumaVisitante === 0 &&
    localValido &&
    visitanteValido &&
    (scoreLocalNum > 0 || scoreVisitanteNum > 0)

  const planillaLista =
    (localCoincide &&
      visitanteCoincide &&
      (scoreLocalNum > 0 || scoreVisitanteNum > 0 || sumaLocal > 0 || sumaVisitante > 0)) ||
    esSoloMarcadorGlobal

  const handleSincronizarMarcadorConPlanilla = () => {
    setMarcadorManualLocal(false)
    setPtsLocalManual('')
    setMarcadorManualVisitante(false)
    setPtsVisitanteManual('')
  }

  // Cierre con confirmación si hay datos sin guardar
  const handleClose = useCallback(() => {
    if (hayDatosCargados && !saving) {
      setConfirmarCierre(true)
    } else {
      onClose()
    }
  }, [hayDatosCargados, saving, onClose])



  // Guardar Planilla Oficial
  const handleGuardar = async () => {
    if (!planillaLista) return
    try {
      setSaving(true)
      setError('')

      await api.post(`/partidos/${partido.id}/resultado`, {
        pts_local: scoreLocalNum,
        pts_visitante: scoreVisitanteNum,
      })

      const payloadStats = []
      const todos = [...jugadoresLocal, ...jugadoresVisitante]

      for (const j of todos) {
        const s = stats[j.id]
        if (s) {
          const l = s.libres || 0
          const d = s.dobles || 0
          const t = s.triples || 0
          const p = s.puntos || (l * 1 + d * 2 + t * 3)

          const tieneDatos =
            p > 0 || l > 0 || d > 0 || t > 0 ||
            (s.robos || 0) > 0 || (s.asistencias || 0) > 0 ||
            (s.rebotes || 0) > 0 || (s.bloqueos || 0) > 0 ||
            (s.perdidas || 0) > 0 || (s.faltas || 0) > 0

          if (tieneDatos) {
            payloadStats.push({
              jugador_id: j.id,
              triples_conv: t, triples_int: t,
              dobles_conv: d, dobles_int: d,
              libres_conv: l, libres_int: l,
              asistencias: s.asistencias || 0,
              reb_defensivos: s.rebotes || 0,
              reb_ofensivos: 0,
              recuperos: s.robos || 0,
              bloqueos: s.bloqueos || 0,
              perdidas: s.perdidas || 0,
              faltas_personales: s.faltas || 0,
            })
          }
        }
      }

      if (payloadStats.length > 0) {
        await api.post(`/partidos/${partido.id}/estadisticas`, { estadisticas: payloadStats })
      }

      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar la planilla')
    } finally {
      setSaving(false)
    }
  }

  // Datos del equipo activo
  const esEquipoLocal = equipoActivo === 'local'
  const jugadoresActuales = esEquipoLocal ? jugadoresLocal : jugadoresVisitante
  const equipoNombreActual = esEquipoLocal ? partido.equipo_local : partido.equipo_visitante
  const equipoIdActual = esEquipoLocal ? partido.equipo_local_id : partido.equipo_visitante_id
  const sumaActual = esEquipoLocal ? sumaLocal : sumaVisitante
  const marcadorActual = esEquipoLocal ? ptsLocal : ptsVisitante
  const coincideActual = esEquipoLocal ? localCoincide : visitanteCoincide
  const marcadorNumActual = parseInt(marcadorActual, 10) || 0
  const tieneDatosActual = esEquipoLocal ? localTieneDatos : visitanteTieneDatos
  const diffActual = marcadorNumActual - sumaActual

  // Totales de columnas para el equipo activo
  const totalesEquipo = useMemo(() => {
    const res = { p1: 0, p2: 0, p3: 0, pts: 0, reb: 0, ast: 0, rob: 0, blq: 0, per: 0, fal: 0 }
    for (const j of jugadoresActuales) {
      const s = stats[j.id] || {}
      res.p1 += s.libres || 0
      res.p2 += s.dobles || 0
      res.p3 += s.triples || 0
      res.pts += s.puntos || 0
      res.reb += s.rebotes || 0
      res.ast += s.asistencias || 0
      res.rob += s.robos || 0
      res.blq += s.bloqueos || 0
      res.per += s.perdidas || 0
      res.fal += s.faltas || 0
    }
    return res
  }, [jugadoresActuales, stats])


  return (
    <Modal titulo="Planilla Oficial de Partido" onClose={handleClose} maxWidth="max-w-6xl">
      {loading ? (
        <div className="py-12">
          <Spinner label="Cargando planilla..." />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 font-sans text-text text-xs relative">

          {/* Overlay de confirmación de cierre */}
          {confirmarCierre && (
            <div data-ui="modal-overlay" className="absolute inset-0 bg-base/95 rounded-lg z-20 flex items-center justify-center">
              <div data-ui="modal" className="bg-surface border border-border rounded-lg p-5 mx-4 max-w-sm w-full">
                <p className="text-sm font-bold text-text mb-1">¿Cerrar sin guardar?</p>
                <p className="text-xs text-text-muted mb-4">
                  Tenés estadísticas cargadas que se van a perder si cerrás ahora.
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmarCierre(false)}
                    className="h-8 px-3 rounded border border-border bg-base text-text-muted hover:text-text text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
                  >
                    Volver a editar
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-8 px-4 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500"
                  >
                    Sí, descartar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Reutilizable de Inscribir Jugador */}
          <ModalInscribirJugador
            isOpen={modalJugadorAbierto}
            onClose={() => setModalJugadorAbierto(false)}
            onJugadorCreado={handleJugadorCreado}
            defaultEquipoId={equipoDestinoModal === 'local' ? partido.equipo_local_id : partido.equipo_visitante_id}
            equipos={[
              { id: partido.equipo_local_id, nombre: partido.equipo_local, sublabel: 'Local' },
              { id: partido.equipo_visitante_id, nombre: partido.equipo_visitante, sublabel: 'Visitante' },
            ]}
          />

          {/* Metadatos del encuentro + Acción rápida para inscribir */}
          <div className="shrink-0 flex items-center justify-between gap-2 text-[11px] text-text-muted px-1 tabular-nums">
            <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden">
              <span className="font-bold text-orange-500 uppercase tracking-wide shrink-0">
                FECHA {partido.numero_fecha || 1}
              </span>
              <span className="text-border select-none">·</span>
              <span className="shrink-0">{formatFecha(partido.fecha)}{partido.horario && ` · ${formatHorario(partido.horario)} hs`}</span>
              {partido.cancha && (
                <>
                  <span className="text-border select-none">·</span>
                  <span className="truncate max-w-[180px]" title={partido.cancha}>{partido.cancha}</span>
                </>
              )}
            </div>

            {/* Acción rápida a la derecha perfectamente nivelada en Y con el texto */}
            <button
              type="button"
              onClick={() => abrirModalInscribir(equipoActivo)}
              className="shrink-0 text-[11px] font-semibold text-orange-500 hover:text-orange-400 flex items-center gap-1 transition-colors hover:underline px-1 py-0.5 rounded hover:bg-orange-500/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
            >
              + Inscribir jugador
            </button>
          </div>

          {error && (
            <div data-ui="alert" className="shrink-0 bg-rose-500/10 border border-rose-500/30 text-rose-500 p-2.5 rounded-md font-semibold text-xs flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {/* Selector de equipos con Marcador Oficial y Puntos de planilla integrados */}
          <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">

            {/* Tarjeta Equipo Local */}
            <div
              onClick={() => setEquipoActivo('local')}
              className={`cursor-pointer p-2.5 sm:p-3 rounded-xl border transition-colors flex items-center justify-between select-none ${
                equipoActivo === 'local'
                  ? 'border-orange-500/60 bg-orange-500/10 ring-1 ring-orange-500/30'
                  : 'border-border bg-surface/70 hover:bg-surface hover:border-orange-500/30 text-text-muted'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <EscudoEquipo
                  url={escudoLocal || partido.escudo_local}
                  nombre={partido.equipo_local}
                  className="w-9 h-9 shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        equipoActivo === 'local'
                          ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                          : 'bg-base text-text-muted'
                      }`}
                    >
                      Local
                    </span>
                    <span className="font-display font-bold text-xs sm:text-sm text-text truncate">
                      {partido.equipo_local}
                    </span>
                  </div>
                  <span className="text-[11px] text-text-muted mt-0.5">
                    Planilla: <strong className="tabular-nums text-text">{sumaLocal} pts</strong>{' '}
                    {jugadoresLocal.length > 0 && (
                      <span className="text-text-muted/80">({progresLocal}/{jugadoresLocal.length} jug.)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Casillero de Marcador Oficial */}
              <div className="flex items-center gap-2 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                <div data-ui="marcador-box" className="flex items-center gap-1.5 bg-base px-2 py-1 rounded-lg">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-text-muted">
                    Marcador
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={ptsLocal}
                    onChange={(e) => handleCambioMarcadorLocal(e.target.value)}
                    onKeyDown={blockNonNumeric}
                    inputMode="numeric"
                    title={
                      marcadorManualLocal
                        ? `Marcador manual de ${partido.equipo_local} (borrá el valor para volver a sincronizar automáticamente)`
                        : `Marcador de ${partido.equipo_local} sincronizado automáticamente con la planilla`
                    }
                    className="w-12 h-6 text-center tabular-nums font-bold text-xs rounded border border-border bg-surface text-text outline-none focus:border-orange-500 focus-visible:ring-1 focus-visible:ring-orange-500"
                  />
                  {localCoincide && scoreLocalNum > 0 ? (
                    <span
                      className="text-[10px] font-bold px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                      title="Marcador coincide con la planilla"
                    >
                      OK
                    </span>
                  ) : localTieneDatos ? (
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400" title="Diferencia con la planilla" />
                  ) : null}
                </div>
              </div>
            </div>

            {/* Tarjeta Equipo Visitante */}
            <div
              onClick={() => setEquipoActivo('visitante')}
              className={`cursor-pointer p-2.5 sm:p-3 rounded-xl border transition-colors flex items-center justify-between select-none ${
                equipoActivo === 'visitante'
                  ? 'border-orange-500/60 bg-orange-500/10 ring-1 ring-orange-500/30'
                  : 'border-border bg-surface/70 hover:bg-surface hover:border-orange-500/30 text-text-muted'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <EscudoEquipo
                  url={escudoVisitante || partido.escudo_visitante}
                  nombre={partido.equipo_visitante}
                  className="w-9 h-9 shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        equipoActivo === 'visitante'
                          ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                          : 'bg-base text-text-muted'
                      }`}
                    >
                      Visitante
                    </span>
                    <span className="font-display font-bold text-xs sm:text-sm text-text truncate">
                      {partido.equipo_visitante}
                    </span>
                  </div>
                  <span className="text-[11px] text-text-muted mt-0.5">
                    Planilla: <strong className="tabular-nums text-text">{sumaVisitante} pts</strong>{' '}
                    {jugadoresVisitante.length > 0 && (
                      <span className="text-text-muted/80">({progresVisitante}/{jugadoresVisitante.length} jug.)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Casillero de Marcador Oficial */}
              <div className="flex items-center gap-2 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                <div data-ui="marcador-box" className="flex items-center gap-1.5 bg-base px-2 py-1 rounded-lg">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-text-muted">
                    Marcador
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={ptsVisitante}
                    onChange={(e) => handleCambioMarcadorVisitante(e.target.value)}
                    onKeyDown={blockNonNumeric}
                    inputMode="numeric"
                    title={
                      marcadorManualVisitante
                        ? `Marcador manual de ${partido.equipo_visitante} (borrá el valor para volver a sincronizar automáticamente)`
                        : `Marcador de ${partido.equipo_visitante} sincronizado automáticamente con la planilla`
                    }
                    className="w-12 h-6 text-center tabular-nums font-bold text-xs rounded border border-border bg-surface text-text outline-none focus:border-orange-500 focus-visible:ring-1 focus-visible:ring-orange-500"
                  />
                  {visitanteCoincide && scoreVisitanteNum > 0 ? (
                    <span
                      className="text-[10px] font-bold px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                      title="Marcador coincide con la planilla"
                    >
                      OK
                    </span>
                  ) : visitanteTieneDatos ? (
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400" title="Diferencia con la planilla" />
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Alerta contextual: solo cuando hay diferencia entre marcador y planilla del equipo activo */}
          {(marcadorNumActual > 0 || sumaActual > 0) && !coincideActual && (
            <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-sans">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                <span>
                  {diffActual > 0
                    ? `Faltan asignar ${diffActual} pts en ${equipoNombreActual} (Marcador: ${marcadorNumActual} vs Planilla: ${sumaActual})`
                    : `${equipoNombreActual} tiene ${Math.abs(diffActual)} pts más en planilla que en el marcador (${sumaActual} vs ${marcadorNumActual})`}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopiarSumaActual}
                className="shrink-0 px-2.5 py-0.5 text-[11px] font-semibold rounded bg-orange-500 text-white hover:bg-orange-600 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
                title="Copiar la suma de la planilla al marcador oficial"
              >
                Copiar suma ({sumaActual}) al marcador
              </button>
            </div>
          )}

          {/* Fila 3: TABLA DE JUGADORES */}
          <div data-ui="admin-table" className="border border-border rounded-lg bg-base overflow-hidden flex flex-col max-h-[55vh]">
            <div className="overflow-x-auto overflow-y-auto">
              <table className="w-full text-left border-collapse tabular-nums text-[11px]">
                <thead data-ui="table-head" className="bg-surface border-b border-border text-[10px] font-bold uppercase tracking-wider text-text-muted sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-1 w-10 text-center font-bold text-text-muted">#</th>
                    <th className="py-2 px-2.5 font-sans min-w-[150px] font-bold text-text-muted">Jugador</th>
                    <th className="py-2 px-1 w-11 text-center font-bold text-text bg-orange-500/5" title="Tiros libres convertidos (1 pt c/u)">1P</th>
                    <th className="py-2 px-1 w-11 text-center font-bold text-text bg-orange-500/5" title="Dobles convertidos (2 pts c/u)">2P</th>
                    <th className="py-2 px-1 w-11 text-center font-bold text-text bg-orange-500/5" title="Triples convertidos (3 pts c/u)">3P</th>
                    <th className="py-2 px-1.5 w-14 text-center text-orange-600 dark:text-orange-400 bg-orange-500/15 font-black" title="Puntos totales = 1P + (2P * 2) + (3P * 3)">PTS</th>
                    <th className="py-2 px-1 w-11 text-center text-text-muted" title="Rebotes totales">REB</th>
                    <th className="py-2 px-1 w-11 text-center text-text-muted" title="Asistencias">AST</th>
                    <th className="py-2 px-1 w-11 text-center text-text-muted" title="Robos / Recuperos">ROB</th>
                    <th className="py-2 px-1 w-11 text-center text-text-muted" title="Tapones / Bloqueos">TAP</th>
                    <th className="py-2 px-1 w-11 text-center text-text-muted" title="Pérdidas">PER</th>
                    <th className="py-2 px-1 w-12 text-center text-text-muted" title="Faltas personales (0 a 5)">FAL</th>
                  </tr>
                </thead>
                <tbody data-ui="table-body" className="divide-y divide-border/40">
                  {jugadoresActuales.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="py-8 text-center text-text-muted font-sans italic">
                        No hay jugadores en el plantel de {equipoNombreActual}.{' '}
                        <button
                          type="button"
                          onClick={() => abrirModalInscribir(equipoActivo)}
                          className="text-orange-500 underline underline-offset-2 hover:no-underline font-semibold"
                        >
                          Inscribir uno ahora
                        </button>
                      </td>
                    </tr>
                  ) : (
                    jugadoresActuales.map((j) => (
                      <tr key={j.id} className="hover:bg-surface/50 transition-colors">
                        <td className="py-1 px-1 text-center tabular-nums text-xs font-semibold text-text">
                          {j.numero !== null && j.numero !== undefined ? j.numero : '-'}
                        </td>
                        <td className="py-1 px-2.5 font-sans font-medium text-text truncate max-w-[170px]">{j.nombre}</td>

                        {/* 1P */}
                        <td className="py-1 px-1 text-center bg-orange-500/5">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={getStat(j.id, 'libres')}
                            onChange={(e) => handleStatChange(j.id, 'libres', e.target.value)}
                            onKeyDown={blockNonNumeric}
                            inputMode="numeric"
                            className="w-10 h-7 text-center text-xs font-semibold rounded-md border border-border/70 bg-surface text-text tabular-nums outline-none transition-colors hover:border-orange-500/40 focus:border-orange-500 focus:bg-base focus-visible:ring-1 focus-visible:ring-orange-500"
                          />
                        </td>

                        {/* 2P */}
                        <td className="py-1 px-1 text-center bg-orange-500/5">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={getStat(j.id, 'dobles')}
                            onChange={(e) => handleStatChange(j.id, 'dobles', e.target.value)}
                            onKeyDown={blockNonNumeric}
                            inputMode="numeric"
                            className="w-10 h-7 text-center text-xs font-semibold rounded-md border border-border/70 bg-surface text-text tabular-nums outline-none transition-colors hover:border-orange-500/40 focus:border-orange-500 focus:bg-base focus-visible:ring-1 focus-visible:ring-orange-500"
                          />
                        </td>

                        {/* 3P */}
                        <td className="py-1 px-1 text-center bg-orange-500/5">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={getStat(j.id, 'triples')}
                            onChange={(e) => handleStatChange(j.id, 'triples', e.target.value)}
                            onKeyDown={blockNonNumeric}
                            inputMode="numeric"
                            className="w-10 h-7 text-center text-xs font-semibold rounded-md border border-border/70 bg-surface text-text tabular-nums outline-none transition-colors hover:border-orange-500/40 focus:border-orange-500 focus:bg-base focus-visible:ring-1 focus-visible:ring-orange-500"
                          />
                        </td>

                        {/* PTS: total calculado (1P + 2P*2 + 3P*3) */}
                        <td
                          className="py-1 px-1.5 text-center bg-orange-500/15 tabular-nums font-black text-xs text-orange-600 dark:text-orange-400 select-none"
                          title="Puntos totales = 1P + (2P * 2) + (3P * 3)"
                        >
                          {stats[j.id]?.puntos || 0}
                        </td>

                        {/* REB */}
                        <td className="py-1 px-1 text-center">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={getStat(j.id, 'rebotes')}
                            onChange={(e) => handleStatChange(j.id, 'rebotes', e.target.value)}
                            onKeyDown={blockNonNumeric}
                            inputMode="numeric"
                            className="w-10 h-7 text-center text-xs font-medium rounded-md border border-border/70 bg-surface text-text tabular-nums outline-none transition-colors hover:border-orange-500/40 focus:border-orange-500 focus:bg-base focus-visible:ring-1 focus-visible:ring-orange-500"
                          />
                        </td>

                        {/* AST */}
                        <td className="py-1 px-1 text-center">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={getStat(j.id, 'asistencias')}
                            onChange={(e) => handleStatChange(j.id, 'asistencias', e.target.value)}
                            onKeyDown={blockNonNumeric}
                            inputMode="numeric"
                            className="w-10 h-7 text-center text-xs font-medium rounded-md border border-border/70 bg-surface text-text tabular-nums outline-none transition-colors hover:border-orange-500/40 focus:border-orange-500 focus:bg-base focus-visible:ring-1 focus-visible:ring-orange-500"
                          />
                        </td>

                        {/* ROB */}
                        <td className="py-1 px-1 text-center">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={getStat(j.id, 'robos')}
                            onChange={(e) => handleStatChange(j.id, 'robos', e.target.value)}
                            onKeyDown={blockNonNumeric}
                            inputMode="numeric"
                            className="w-10 h-7 text-center text-xs font-medium rounded-md border border-border/70 bg-surface text-text tabular-nums outline-none transition-colors hover:border-orange-500/40 focus:border-orange-500 focus:bg-base focus-visible:ring-1 focus-visible:ring-orange-500"
                          />
                        </td>

                        {/* TAP */}
                        <td className="py-1 px-1 text-center">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={getStat(j.id, 'bloqueos')}
                            onChange={(e) => handleStatChange(j.id, 'bloqueos', e.target.value)}
                            onKeyDown={blockNonNumeric}
                            inputMode="numeric"
                            className="w-10 h-7 text-center text-xs font-medium rounded-md border border-border/70 bg-surface text-text tabular-nums outline-none transition-colors hover:border-orange-500/40 focus:border-orange-500 focus:bg-base focus-visible:ring-1 focus-visible:ring-orange-500"
                          />
                        </td>

                        {/* PER */}
                        <td className="py-1 px-1 text-center">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={getStat(j.id, 'perdidas')}
                            onChange={(e) => handleStatChange(j.id, 'perdidas', e.target.value)}
                            onKeyDown={blockNonNumeric}
                            inputMode="numeric"
                            className="w-10 h-7 text-center text-xs font-medium rounded-md border border-border/70 bg-surface text-rose-500 tabular-nums outline-none transition-colors hover:border-orange-500/40 focus:border-orange-500 focus:bg-base focus-visible:ring-1 focus-visible:ring-orange-500"
                          />
                        </td>

                        {/* FAL: input numérico con límite reglamentario y alertas */}
                        <td className="py-1 px-1 text-center">
                          <input
                            type="number"
                            min="0"
                            max="5"
                            placeholder="0"
                            value={getStat(j.id, 'faltas')}
                            onChange={(e) => handleStatChange(j.id, 'faltas', e.target.value)}
                            onKeyDown={blockNonNumeric}
                            inputMode="numeric"
                            className={`w-10 h-7 text-center text-xs font-bold rounded-md border tabular-nums outline-none transition-colors ${
                              (stats[j.id]?.faltas || 0) >= 5
                                ? 'border-rose-500/80 bg-rose-500/15 text-rose-500 focus:border-rose-500 focus-visible:ring-1 focus-visible:ring-rose-500'
                                : (stats[j.id]?.faltas || 0) >= 4
                                  ? 'border-amber-500/60 bg-amber-500/10 text-amber-500 focus:border-amber-500 focus-visible:ring-1 focus-visible:ring-amber-500'
                                  : 'border-border/70 bg-surface text-text hover:border-orange-500/40 focus:border-orange-500 focus:bg-base focus-visible:ring-1 focus-visible:ring-orange-500'
                            }`}
                            title={(stats[j.id]?.faltas || 0) >= 5 ? '5 faltas (Límite reglamentario alcanzado)' : 'Faltas personales (0 a 5)'}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* FILA DE TOTALES DEL EQUIPO */}
                <tfoot data-ui="table-foot" className="bg-surface border-t-2 border-border font-bold text-[10px] text-text-muted sticky bottom-0">
                  <tr>
                    <td colSpan="2" className="py-2.5 px-2.5 text-right font-display uppercase tracking-wider text-text">
                      Totales de {equipoNombreActual}:
                    </td>
                    <td className="py-2.5 px-1 text-center text-text font-bold bg-orange-500/5">{totalesEquipo.p1}</td>
                    <td className="py-2.5 px-1 text-center text-text font-bold bg-orange-500/5">{totalesEquipo.p2}</td>
                    <td className="py-2.5 px-1 text-center text-text font-bold bg-orange-500/5">{totalesEquipo.p3}</td>
                    <td className="py-2.5 px-1.5 text-center text-orange-600 dark:text-orange-400 font-black bg-orange-500/15 text-xs">{totalesEquipo.pts}</td>
                    <td className="py-2.5 px-1 text-center">{totalesEquipo.reb}</td>
                    <td className="py-2.5 px-1 text-center">{totalesEquipo.ast}</td>
                    <td className="py-2.5 px-1 text-center text-text font-bold">{totalesEquipo.rob}</td>
                    <td className="py-2.5 px-1 text-center">{totalesEquipo.blq}</td>
                    <td className="py-2.5 px-1 text-center">{totalesEquipo.per}</td>
                    <td className="py-2.5 px-1 text-center text-orange-600 dark:text-orange-400 font-bold">{totalesEquipo.fal}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Fila 4: Barra Inferior con Resumen y Guardado */}
          <div data-ui="modal-footer" className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
            <div className="text-xs tabular-nums w-full sm:w-auto">
              {esPartidoEnBlanco ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface text-text-muted">
                  <span className="w-2 h-2 rounded-full bg-border shrink-0" />
                  <span>Planilla en blanco: Cargá las estadísticas en la tabla o ingresá el marcador final.</span>
                </div>
              ) : esSoloMarcadorGlobal ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                  <span>Marcador global: Se guardará el resultado final ({partido.equipo_local} {scoreLocalNum} - {scoreVisitanteNum} {partido.equipo_visitante}) sin estadísticas individuales.</span>
                </div>
              ) : planillaLista ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Planilla verificada: Los puntos de ambos equipos coinciden con el marcador ({partido.equipo_local} {scoreLocalNum} - {scoreVisitanteNum} {partido.equipo_visitante}).</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-xs font-medium">
                    El marcador ({scoreLocalNum || 0} - {scoreVisitanteNum || 0}) difiere de la planilla ({sumaLocal} - {sumaVisitante}).
                  </span>
                  <button
                    type="button"
                    onClick={handleSincronizarMarcadorConPlanilla}
                    className="text-xs font-bold underline hover:no-underline text-orange-600 dark:text-orange-400 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500 rounded"
                  >
                    Sincronizar marcador
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="h-9 px-4 rounded-xl border border-border bg-surface text-xs font-semibold text-text-muted hover:text-text transition-colors inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardar}
                disabled={saving || !planillaLista}
                className="h-9 px-5 rounded-xl border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-orange-600 dark:text-orange-400 font-display font-bold text-xs uppercase active:scale-95 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                {saving ? 'Guardando...' : 'Guardar Planilla Oficial'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}