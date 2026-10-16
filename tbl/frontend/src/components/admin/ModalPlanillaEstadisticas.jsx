import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'
import api from '../../services/api'

export default function ModalPlanillaEstadisticas({ partido, onClose, onSaved }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [equipoActivo, setEquipoActivo] = useState('local') // 'local' | 'visitante'
  const [jugadoresLocal, setJugadoresLocal] = useState([])
  const [jugadoresVisitante, setJugadoresVisitante] = useState([])

  // Estado simple: { [jugadorId]: { puntos: number, triples: number, faltas: number } }
  const [playerData, setPlayerData] = useState({})
  const [sincronizarConMarcador, setSincronizarConMarcador] = useState(true)

  useEffect(() => {
    async function cargarDatos() {
      try {
        setLoading(true)
        setError('')

        const [resLocal, resVisit, resStats] = await Promise.all([
          partido.equipo_local_id ? api.get(`/equipos/${partido.equipo_local_id}`) : Promise.resolve({ data: { jugadores: [] } }),
          partido.equipo_visitante_id ? api.get(`/equipos/${partido.equipo_visitante_id}`) : Promise.resolve({ data: { jugadores: [] } }),
          api.get(`/partidos/${partido.id}/estadisticas`),
        ])

        setJugadoresLocal(resLocal.data.jugadores || [])
        setJugadoresVisitante(resVisit.data.jugadores || [])

        // Reconstruir puntos y faltas de estadísticas previas
        const mapa = {}
        for (const st of resStats.data) {
          const triples = st.triples_conv || 0
          const pts = st.puntos ?? ((st.libres_conv || 0) + (st.dobles_conv || 0) * 2 + triples * 3)
          mapa[st.jugador_id] = {
            puntos: pts || 0,
            triples: triples,
            faltas: st.faltas_personales || 0,
          }
        }
        setPlayerData(mapa)
      } catch (err) {
        setError(err.response?.data?.detail || 'Error al cargar los jugadores del partido')
      } finally {
        setLoading(false)
      }
    }
    cargarDatos()
  }, [partido.id, partido.equipo_local_id, partido.equipo_visitante_id])

  const getJugadorData = (id) => playerData[id] || { puntos: 0, triples: 0, faltas: 0 }

  const modificarValor = (id, campo, delta) => {
    setPlayerData((prev) => {
      const actual = prev[id] || { puntos: 0, triples: 0, faltas: 0 }
      let nuevo = Math.max(0, (actual[campo] || 0) + delta)

      // Si se suman triples, asegurar que los puntos sean al menos triples * 3
      if (campo === 'triples') {
        const minPuntos = nuevo * 3
        const puntosAjustados = Math.max(actual.puntos, minPuntos)
        return { ...prev, [id]: { ...actual, triples: nuevo, puntos: puntosAjustados } }
      }

      // Si se bajan puntos por debajo de los triples * 3, reducir triples si hiciera falta
      if (campo === 'puntos') {
        const maxTriples = Math.floor(nuevo / 3)
        const triplesAjustados = Math.min(actual.triples, maxTriples)
        return { ...prev, [id]: { ...actual, puntos: nuevo, triples: triplesAjustados } }
      }

      if (campo === 'faltas') {
        nuevo = Math.min(5, nuevo) // Máximo 5 faltas
      }

      return { ...prev, [id]: { ...actual, [campo]: nuevo } }
    })
  }

  const setValorDirecto = (id, campo, valor) => {
    const num = Math.max(0, parseInt(valor, 10) || 0)
    setPlayerData((prev) => {
      const actual = prev[id] || { puntos: 0, triples: 0, faltas: 0 }
      if (campo === 'puntos') {
        const maxTriples = Math.floor(num / 3)
        return { ...prev, [id]: { ...actual, puntos: num, triples: Math.min(actual.triples, maxTriples) } }
      }
      if (campo === 'triples') {
        return { ...prev, [id]: { ...actual, triples: num, puntos: Math.max(actual.puntos, num * 3) } }
      }
      if (campo === 'faltas') {
        return { ...prev, [id]: { ...actual, faltas: Math.min(5, num) } }
      }
      return prev
    })
  }

  // Cálculos totales
  const totalPuntosEquipo = (jugadores) => {
    return jugadores.reduce((acc, j) => acc + (playerData[j.id]?.puntos || 0), 0)
  }

  const totalLocal = totalPuntosEquipo(jugadoresLocal)
  const totalVisitante = totalPuntosEquipo(jugadoresVisitante)

  const handleGuardar = async () => {
    try {
      setSaving(true)
      setError('')

      // Convertir formato simple a formato backend (libres, dobles, triples)
      const payloadStats = []
      for (const [jIdStr, data] of Object.entries(playerData)) {
        const jId = parseInt(jIdStr, 10)
        const pts = data.puntos || 0
        const triples = data.triples || 0
        const faltas = data.faltas || 0

        if (pts > 0 || triples > 0 || faltas > 0) {
          // Descomponer puntos en triples, dobles y libres
          const ptsTriples = triples * 3
          const ptsRestantes = Math.max(0, pts - ptsTriples)
          const dobles = Math.floor(ptsRestantes / 2)
          const libres = ptsRestantes % 2

          payloadStats.push({
            jugador_id: jId,
            triples_conv: triples,
            triples_int: triples,
            dobles_conv: dobles,
            dobles_int: dobles,
            libres_conv: libres,
            libres_int: libres,
            faltas_personales: faltas,
          })
        }
      }

      if (payloadStats.length > 0) {
        await api.post(`/partidos/${partido.id}/estadisticas`, { estadisticas: payloadStats })
      }

      // Si está marcada la sincronización, actualiza el resultado general del partido
      if (sincronizarConMarcador && (totalLocal > 0 || totalVisitante > 0)) {
        await api.post(`/partidos/${partido.id}/resultado`, {
          pts_local: totalLocal,
          pts_visitante: totalVisitante,
        })
      }

      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudieron guardar los puntos')
    } finally {
      setSaving(false)
    }
  }

  const jugadoresAMostrar = equipoActivo === 'local' ? jugadoresLocal : jugadoresVisitante

  return (
    <Modal titulo="Anotador de Puntos por Jugador" onClose={onClose} maxWidth="max-w-3xl">
      {loading ? (
        <div className="py-12">
          <Spinner label="Cargando jugadores..." />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
              {error}
            </div>
          )}

          {/* Marcador Suma Total */}
          <div className="flex items-center justify-between rounded-2xl border-2 border-border bg-base p-4">
            <div className="text-left">
              <span className="text-xs font-bold text-text-muted">Local</span>
              <p className="text-lg sm:text-xl font-black text-text">{partido.equipo_local}</p>
              <p className="text-2xl sm:text-3xl font-black text-orange-500 tabular-nums">{totalLocal} pts</p>
            </div>

            <div className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-text-muted">
              Total Sumado
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-text-muted">Visitante</span>
              <p className="text-lg sm:text-xl font-black text-text">{partido.equipo_visitante}</p>
              <p className="text-2xl sm:text-3xl font-black text-orange-500 tabular-nums">{totalVisitante} pts</p>
            </div>
          </div>

          {/* Selector de qué equipo cargar */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEquipoActivo('local')}
              className={`flex-1 rounded-xl py-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                equipoActivo === 'local'
                  ? 'bg-orange-500 text-white'
                  : 'border border-border bg-base text-text-muted hover:text-text'
              }`}
            >
              Plantel {partido.equipo_local} ({totalLocal} pts)
            </button>
            <button
              type="button"
              onClick={() => setEquipoActivo('visitante')}
              className={`flex-1 rounded-xl py-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                equipoActivo === 'visitante'
                  ? 'bg-orange-500 text-white'
                  : 'border border-border bg-base text-text-muted hover:text-text'
              }`}
            >
              Plantel {partido.equipo_visitante} ({totalVisitante} pts)
            </button>
          </div>

          <p className="text-xs text-text-muted text-center">
            Tocá los botones <strong>+1, +2 o +3</strong> para sumar puntos rápidamente, o escribí el número directamente.
          </p>

          {/* Lista de Jugadores */}
          <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
            {jugadoresAMostrar.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-8 text-center text-text-muted text-sm">
                No hay jugadores cargados en este equipo.
              </div>
            ) : (
              jugadoresAMostrar.map((j) => {
                const data = getJugadorData(j.id)
                return (
                  <div
                    key={j.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-base p-3 hover:border-orange-500/40 transition-colors"
                  >
                    {/* Nombre */}
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-surface border border-border text-sm font-bold text-orange-500">
                        {j.nombre.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-base text-text">{j.nombre}</p>
                        <p className="text-xs text-text-muted">
                          {data.puntos > 0 ? `${data.puntos} puntos anotados` : 'Sin puntos'}
                        </p>
                      </div>
                    </div>

                    {/* Controles de Puntos */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Casillero principal de puntos */}
                      <div className="flex items-center gap-1 bg-surface p-1.5 rounded-xl border border-border">
                        <button
                          type="button"
                          onClick={() => modificarValor(j.id, 'puntos', -1)}
                          className="h-9 w-9 rounded-lg border border-border bg-base font-bold text-text hover:bg-red-500 hover:text-white transition-colors text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                        >
                          -1
                        </button>

                        <input
                          type="number"
                          min="0"
                          value={data.puntos || ''}
                          placeholder="0"
                          onChange={(e) => setValorDirecto(j.id, 'puntos', e.target.value)}
                          className="h-9 w-14 rounded-lg bg-base text-center font-black text-lg text-orange-500 outline-none tabular-nums focus-visible:ring-1 focus-visible:ring-orange-500"
                        />

                        <button
                          type="button"
                          onClick={() => modificarValor(j.id, 'puntos', 1)}
                          className="h-9 w-9 rounded-lg bg-orange-500 font-bold text-white hover:bg-orange-600 transition-colors text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
                          title="Tiro libre (+1)"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => modificarValor(j.id, 'puntos', 2)}
                          className="h-9 w-9 rounded-lg bg-orange-500 font-bold text-white hover:bg-orange-600 transition-colors text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
                          title="Doble (+2)"
                        >
                          +2
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            modificarValor(j.id, 'triples', 1)
                          }}
                          className="h-9 w-10 rounded-lg bg-orange-600 font-bold text-white hover:bg-orange-700 transition-colors text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
                          title="Triple (+3)"
                        >
                          +3
                        </button>
                      </div>

                      {/* Faltas (opcional) */}
                      <div className="flex items-center gap-1 bg-surface px-2 py-1.5 rounded-xl border border-border">
                        <span className="text-xs font-semibold text-text-muted">Faltas:</span>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          value={data.faltas || ''}
                          placeholder="0"
                          onChange={(e) => setValorDirecto(j.id, 'faltas', e.target.value)}
                          className="h-8 w-10 rounded bg-base text-center font-bold text-sm text-text outline-none tabular-nums focus-visible:ring-1 focus-visible:ring-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Botones inferiores */}
          <div data-ui="modal-footer" className="mt-2 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={sincronizarConMarcador}
                onChange={(e) => setSincronizarConMarcador(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-orange-500"
              />
              <span>
                Actualizar marcador final del partido con estos totales ({totalLocal} a {totalVisitante})
              </span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-muted hover:bg-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardar}
                disabled={saving}
                className="h-9 px-5 rounded-xl border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 font-display font-bold text-xs uppercase active:scale-95 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                {saving ? 'Guardando...' : 'Guardar Puntos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
