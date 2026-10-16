import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import api from '../../services/api'
import Spinner from '../ui/Spinner'
import { IconClose } from '../ui/Icon'
import useBodyLock from '../../hooks/useBodyLock'

function parseError(err) {
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg || (d.loc ? `${d.loc.slice(-1)}: ${d.msg}` : JSON.stringify(d))).join(', ')
  }
  if (typeof detail === 'object' && detail !== null) {
    return detail.message || JSON.stringify(detail)
  }
  return 'No se pudo programar el partido. Verificá los datos ingresados.'
}

export default function ModalProgramarPartido({
  isOpen,
  onClose,
  initialTorneoId,
  onPartidoCreado,
}) {
  useBodyLock(isOpen)
  const [torneos, setTorneos] = useState([])
  const [equipos, setEquipos] = useState([])
  const [canchas, setCanchas] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(null)

  const [modoOtraCancha, setModoOtraCancha] = useState(false)
  const [otraCanchaTexto, setOtraCanchaTexto] = useState('')

  const [form, setForm] = useState({
    torneo_id: initialTorneoId || '',
    fecha_numero: 1,
    fecha_dia: '',
    horario: '',
    cancha: '',
    fase: 'FASE REGULAR',
    equipo_local_id: '',
    equipo_visitante_id: '',
  })

  // Carga de datos cuando se abre el modal
  useEffect(() => {
    if (!isOpen) return

    async function init() {
      try {
        setLoading(true)
        setError('')
        setExito(null)
        const [resTorneos, resEquipos, resCanchas] = await Promise.all([
          api.get('/torneos?todos=true'),
          api.get('/equipos?todos=true'),
          api.get('/canchas').catch(() => ({ data: [] })),
        ])

        const torneosData = resTorneos.data || []
        const equiposData = resEquipos.data || []
        const canchasData = resCanchas.data || []

        setTorneos(torneosData)
        setEquipos(equiposData)
        setCanchas(canchasData)

        let targetTorneo = null
        if (initialTorneoId && torneosData.some((t) => t.id === Number(initialTorneoId))) {
          targetTorneo = torneosData.find((t) => t.id === Number(initialTorneoId))
        } else if (torneosData.length > 0) {
          targetTorneo = torneosData.find((t) => t.estado === 'activo') || torneosData[0]
        }

        setForm((prev) => ({
          ...prev,
          torneo_id: targetTorneo ? String(targetTorneo.id) : prev.torneo_id,
          equipo_local_id: '',
          equipo_visitante_id: '',
        }))
      } catch (err) {
        setError('Error al cargar datos para programar partido.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [isOpen, initialTorneoId])

  // Agrupación general de equipos por categoría de torneo
  const equiposPorCategoria = useMemo(() => {
    const grupos = {}
    equipos.forEach((eq) => {
      const etiqueta = eq.categoria
        ? `${eq.torneo_nombre ? eq.torneo_nombre + ' · ' : ''}${eq.categoria}`
        : 'Otras Categorías / Sin Torneo'
      if (!grupos[etiqueta]) grupos[etiqueta] = []
      grupos[etiqueta].push(eq)
    })
    return grupos
  }, [equipos])

  // Filtrado de equipos disponibles según el torneo seleccionado o si es fase de promoción
  const equiposDisponibles = useMemo(() => {
    const esPromocion = form.fase === 'PROMOCION / DESCENSO'
    if (esPromocion) {
      return { esCruce: true, grupos: equiposPorCategoria, lista: [] }
    }
    const filtrados = equipos.filter((eq) => String(eq.torneo_id) === String(form.torneo_id))
    return { esCruce: false, grupos: {}, lista: filtrados }
  }, [equipos, form.torneo_id, form.fase, equiposPorCategoria])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setExito(null)

    if (!form.equipo_local_id || !form.equipo_visitante_id) {
      setError('Debés seleccionar tanto el equipo local como el visitante.')
      return
    }

    if (form.equipo_local_id === form.equipo_visitante_id) {
      setError('El equipo local y el visitante no pueden ser el mismo club.')
      return
    }

    const canchaFinal = modoOtraCancha ? otraCanchaTexto.trim() : form.cancha.trim()

    try {
      setSaving(true)
      const payload = {
        torneo_id: parseInt(form.torneo_id, 10),
        fecha_numero: parseInt(form.fecha_numero, 10),
        fecha_dia: form.fecha_dia || null,
        horario: form.horario
          ? form.horario.includes(':') && form.horario.split(':').length === 2
            ? `${form.horario}:00`
            : form.horario
          : null,
        cancha: canchaFinal || null,
        fase: form.fase || 'FASE REGULAR',
        equipo_local_id: parseInt(form.equipo_local_id, 10),
        equipo_visitante_id: parseInt(form.equipo_visitante_id, 10),
      }

      await api.post('/partidos', payload)

      const localObj = equipos.find((eq) => String(eq.id) === String(form.equipo_local_id))
      const visitObj = equipos.find((eq) => String(eq.id) === String(form.equipo_visitante_id))

      setExito({
        localNombre: localObj?.nombre || 'Local',
        visitNombre: visitObj?.nombre || 'Visitante',
        torneoId: form.torneo_id,
      })
      onPartidoCreado?.(form.torneoId)
    } catch (err) {
      setError(parseError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleProgramarOtro = () => {
    setExito(null)
    setError('')
    setForm((prev) => ({
      ...prev,
      equipo_local_id: '',
      equipo_visitante_id: '',
    }))
  }

  if (!isOpen) return null

  return createPortal(
    <div
      data-ui="modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200 touch-none overscroll-contain"
      onClick={() => {
        if (!saving) onClose?.()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Programar Partido"
    >
      <div
        data-ui="modal"
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface text-text p-6 animate-in zoom-in-95 duration-200 flex flex-col gap-4 touch-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div data-ui="modal-header" className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="font-bold text-base text-text uppercase tracking-wider font-display">
              Programar Partido
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Agendá encuentros oficiales del fixture, fases de playoffs o cruces de promoción y descenso.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-border bg-page text-text-muted hover:text-orange-500 hover:border-orange-500/40 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Cerrar modal"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* Alerta de Éxito */}
        {exito && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span>
                ¡Partido programado exitosamente! <strong>{exito.localNombre}</strong> vs{' '}
                <strong>{exito.visitNombre}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleProgramarOtro}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                + Programar otro
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-surface border border-emerald-500/40 text-emerald-300 font-semibold text-xs hover:border-emerald-500/80 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Listo
              </button>
            </div>
          </div>
        )}

        {/* Alerta de Error */}
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-xs font-medium text-danger flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="text-xs hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-danger rounded px-1"
            >
              Cerrar
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-8">
            <Spinner label="Cargando formulario de programación…" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Torneo / Categoría */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Torneo / Categoría
              </label>
              <select
                value={form.torneo_id}
                onChange={(e) => {
                  const nuevoTorneo = e.target.value
                  setForm((prev) => ({
                    ...prev,
                    torneo_id: nuevoTorneo,
                    equipo_local_id: '',
                    equipo_visitante_id: '',
                  }))
                }}
                className="h-9 rounded-xl border border-border bg-page px-3 text-xs font-semibold text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
                required
              >
                {torneos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} {t.temporada} - {t.categoria}
                  </option>
                ))}
              </select>
            </div>

            {/* Equipo Local */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Equipo Local
              </label>
              <select
                value={form.equipo_local_id}
                onChange={(e) => setForm({ ...form, equipo_local_id: e.target.value })}
                className="h-9 rounded-xl border border-border bg-page px-3 text-xs font-semibold text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
                required
              >
                <option value="">Seleccionar equipo local…</option>
                {equiposDisponibles.esCruce ? (
                  Object.entries(equiposDisponibles.grupos).map(([grupo, lista]) => (
                    <optgroup key={grupo} label={grupo}>
                      {lista.map((eq) => (
                        <option
                          key={eq.id}
                          value={eq.id}
                          disabled={String(eq.id) === String(form.equipo_visitante_id)}
                        >
                          {eq.nombre}
                        </option>
                      ))}
                    </optgroup>
                  ))
                ) : equiposDisponibles.lista.length > 0 ? (
                  equiposDisponibles.lista.map((eq) => (
                    <option
                      key={eq.id}
                      value={eq.id}
                      disabled={String(eq.id) === String(form.equipo_visitante_id)}
                    >
                      {eq.nombre}
                    </option>
                  ))
                ) : (
                  <option disabled value="">
                    No hay equipos inscriptos en este torneo
                  </option>
                )}
              </select>
            </div>

            {/* Equipo Visitante */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Equipo Visitante
              </label>
              <select
                value={form.equipo_visitante_id}
                onChange={(e) => setForm({ ...form, equipo_visitante_id: e.target.value })}
                className="h-9 rounded-xl border border-border bg-page px-3 text-xs font-semibold text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
                required
              >
                <option value="">Seleccionar equipo visitante…</option>
                {equiposDisponibles.esCruce ? (
                  Object.entries(equiposDisponibles.grupos).map(([grupo, lista]) => (
                    <optgroup key={grupo} label={grupo}>
                      {lista.map((eq) => (
                        <option
                          key={eq.id}
                          value={eq.id}
                          disabled={String(eq.id) === String(form.equipo_local_id)}
                        >
                          {eq.nombre}
                        </option>
                      ))}
                    </optgroup>
                  ))
                ) : equiposDisponibles.lista.length > 0 ? (
                  equiposDisponibles.lista.map((eq) => (
                    <option
                      key={eq.id}
                      value={eq.id}
                      disabled={String(eq.id) === String(form.equipo_local_id)}
                    >
                      {eq.nombre}
                    </option>
                  ))
                ) : (
                  <option disabled value="">
                    No hay equipos inscriptos en este torneo
                  </option>
                )}
              </select>
            </div>

            {equiposDisponibles.esCruce ? (
              <div className="sm:col-span-2 -mt-2">
                <p className="text-[11px] text-amber-500 font-medium">
                  Fase de Promoción / Descenso: podés cruzar equipos de diferentes categorías.
                </p>
              </div>
            ) : equiposDisponibles.lista.length === 0 ? (
              <div className="sm:col-span-2 -mt-2">
                <p className="text-[11px] text-rose-400 font-medium">
                  Este torneo aún no tiene equipos inscriptos. Podés inscribirlos desde "Equipos y Planteles".
                </p>
              </div>
            ) : null}

            {/* Fecha / Jornada del Fixture */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Jornada / Fecha del fixture (Nº)
              </label>
              <input
                type="number"
                min="1"
                value={form.fecha_numero}
                onChange={(e) => setForm({ ...form, fecha_numero: e.target.value })}
                className="h-9 rounded-xl border border-border bg-page px-3 text-xs text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
                required
              />
            </div>

            {/* Fase de Competencia */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Fase de Competencia
              </label>
              <select
                value={form.fase}
                onChange={(e) => {
                  const nuevaFase = e.target.value
                  setForm((prev) => ({
                    ...prev,
                    fase: nuevaFase,
                    equipo_local_id: '',
                    equipo_visitante_id: '',
                  }))
                }}
                className="h-9 rounded-xl border border-border bg-page px-3 text-xs font-semibold text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              >
                <option value="FASE REGULAR">Fase Regular</option>
                <option value="OCTAVOS">Octavos de Final</option>
                <option value="CUARTOS">Cuartos de Final</option>
                <option value="SEMIFINAL">Semifinal</option>
                <option value="FINAL">Final</option>
                <option value="PROMOCION / DESCENSO">Promoción / Descenso</option>
              </select>
            </div>

            {/* Día de Juego */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Día de Juego (opcional)
              </label>
              <input
                type="date"
                value={form.fecha_dia}
                onChange={(e) => setForm({ ...form, fecha_dia: e.target.value })}
                className="h-9 rounded-xl border border-border bg-page px-3 text-xs text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              />
            </div>

            {/* Horario */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Horario (opcional)
              </label>
              <input
                type="time"
                value={form.horario}
                onChange={(e) => setForm({ ...form, horario: e.target.value })}
                className="h-9 rounded-xl border border-border bg-page px-3 text-xs text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              />
            </div>

            {/* Cancha */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Cancha (opcional)
              </label>
              <select
                value={modoOtraCancha ? 'OTRA' : form.cancha}
                onChange={(e) => {
                  if (e.target.value === 'OTRA') {
                    setModoOtraCancha(true)
                    setForm({ ...form, cancha: otraCanchaTexto })
                  } else {
                    setModoOtraCancha(false)
                    setForm({ ...form, cancha: e.target.value })
                  }
                }}
                className="h-9 rounded-xl border border-border bg-page px-3 text-xs font-semibold text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              >
                <option value="">Seleccionar cancha habilitada…</option>
                {canchas.map((c) => (
                  <option key={c.id} value={c.nombre}>
                    {c.nombre} {c.ciudad ? `(${c.ciudad}${c.direccion ? ' · ' + c.direccion : ''})` : ''}
                  </option>
                ))}
                <option value="OTRA">+ Otra cancha / Sede externa…</option>
              </select>

              {modoOtraCancha && (
                <input
                  type="text"
                  placeholder="Escribí el nombre de la cancha o sede externa…"
                  value={otraCanchaTexto}
                  onChange={(e) => {
                    setOtraCanchaTexto(e.target.value)
                    setForm({ ...form, cancha: e.target.value })
                  }}
                  className="mt-1 h-9 rounded-xl border border-border bg-page px-3 text-xs text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
                  autoFocus
                />
              )}
            </div>

            {/* Botones de Envío */}
            <div data-ui="modal-footer" className="sm:col-span-2 mt-2 flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="h-9 px-4 rounded-xl border border-border bg-surface text-xs font-semibold text-text-muted hover:text-text transition-colors inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-9 px-5 rounded-xl border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 font-display font-bold text-xs uppercase active:scale-95 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                {saving ? 'Guardando…' : 'Programar Partido'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
