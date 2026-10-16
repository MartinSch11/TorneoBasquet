import { useEffect, useState } from 'react'
import api from '../../services/api'
import Spinner from '../ui/Spinner'
import EscudoEquipo from '../ui/EscudoEquipo'
import { useToast } from '../../context/ToastContext'
import ModalCrearEquipo from './ModalCrearEquipo'
import ModalInscribirJugador from './ModalInscribirJugador'

export default function GestionEquipos() {
  const { toast } = useToast()
  const [equipos, setEquipos] = useState([])
  const [torneos, setTorneos] = useState([])
  const [filtroTorneoId, setFiltroTorneoId] = useState('all')
  const [loading, setLoading] = useState(true)

  // Modales
  const [modalEquipoAbierto, setModalEquipoAbierto] = useState(false)
  const [equipoAEditar, setEquipoAEditar] = useState(null)
  const [modalJugadorAbierto, setModalJugadorAbierto] = useState(false)
  const [jugadorAEditar, setJugadorAEditar] = useState(null)

  // Filtros y búsqueda de equipos
  const [busquedaEquipo, setBusquedaEquipo] = useState('')
  const [filtroEstadoEquipo, setFiltroEstadoEquipo] = useState('activos')

  // Equipo seleccionado y su plantel
  const [selectedEquipoId, setSelectedEquipoId] = useState(null)
  const [plantelDetalle, setPlantelDetalle] = useState(null)
  const [loadingPlantel, setLoadingPlantel] = useState(false)
  const [eliminandoJugadorId, setEliminandoJugadorId] = useState(null)
  const [eliminandoEquipo, setEliminandoEquipo] = useState(false)
  const [reactivandoEquipo, setReactivandoEquipo] = useState(false)
  const [vistaMobile, setVistaMobile] = useState('lista') // 'lista' | 'detalle'

  const cargarDatos = async (torneoId = filtroTorneoId) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('todos', 'true')
      if (torneoId && torneoId !== 'all') {
        params.set('torneo_id', torneoId)
      }

      const [resEquipos, resTorneos] = await Promise.all([
        api.get(`/equipos?${params.toString()}`),
        api.get('/torneos?todos=true'),
      ])

      setEquipos(resEquipos.data)
      setTorneos(resTorneos.data)

      // Seleccionar primer equipo si el actual ya no está en la lista recibida
      const sigueExistiendo = resEquipos.data.some((e) => e.id === selectedEquipoId)
      if (!sigueExistiendo && resEquipos.data.length > 0) {
        const primerId = resEquipos.data[0].id
        setSelectedEquipoId(primerId)
        cargarPlantel(primerId)
      } else if (resEquipos.data.length === 0) {
        setSelectedEquipoId(null)
        setPlantelDetalle(null)
      }
    } catch (err) {
      toast.error('Error al cargar equipos y torneos')
    } finally {
      setLoading(false)
    }
  }

  const cargarPlantel = async (equipoId) => {
    if (!equipoId) return
    try {
      setLoadingPlantel(true)
      const res = await api.get(`/equipos/${equipoId}`)
      setPlantelDetalle(res.data)
    } catch (err) {
      toast.error('Error al cargar el plantel del equipo')
    } finally {
      setLoadingPlantel(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const handleCambiarFiltroTorneo = async (torneoId) => {
    setFiltroTorneoId(torneoId)
    await cargarDatos(torneoId)
  }

  const handleSeleccionarEquipo = (eq) => {
    setSelectedEquipoId(eq.id)
    cargarPlantel(eq.id)
    setVistaMobile('detalle')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleVolverALista = () => {
    setVistaMobile('lista')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleEquipoCreado = async (nuevoEquipo) => {
    toast.success(`Equipo "${nuevoEquipo.nombre}" registrado exitosamente`)
    await cargarDatos(filtroTorneoId)
    if (nuevoEquipo?.id) {
      setSelectedEquipoId(nuevoEquipo.id)
      cargarPlantel(nuevoEquipo.id)
      setVistaMobile('detalle')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleEquipoActualizado = (equipoActualizado) => {
    toast.success(`Equipo "${equipoActualizado.nombre}" actualizado correctamente`)
    setEquipos((prev) =>
      prev.map((e) => (e.id === equipoActualizado.id ? { ...e, ...equipoActualizado } : e))
    )
    if (selectedEquipoId === equipoActualizado.id) {
      setPlantelDetalle((prev) =>
        prev
          ? {
            ...prev,
            nombre: equipoActualizado.nombre,
            escudo_url: equipoActualizado.escudo_url,
          }
          : prev
      )
    }
  }

  const handleJugadorCreado = (nuevoJugador) => {
    toast.success(`Jugador "${nuevoJugador.nombre}" inscripto en el plantel`)
    setPlantelDetalle((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        jugadores: [...(prev.jugadores || []), nuevoJugador],
      }
    })
  }

  const handleAbrirEditarJugador = (jugador) => {
    setJugadorAEditar(jugador)
    setModalJugadorAbierto(true)
  }

  const handleJugadorActualizado = (jugadorActualizado) => {
    toast.success(`Jugador "${jugadorActualizado.nombre}" actualizado`)
    setPlantelDetalle((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        jugadores: prev.jugadores.map((j) =>
          j.id === jugadorActualizado.id ? jugadorActualizado : j,
        ),
      }
    })
  }

  const handleEliminarJugador = async (jugador) => {
    const confirmar = window.confirm(
      `¿Remover a ${jugador.nombre} del plantel de ${plantelDetalle?.nombre}?`,
    )
    if (!confirmar) return

    try {
      setEliminandoJugadorId(jugador.id)
      await api.delete(`/equipos/${selectedEquipoId}/jugadores/${jugador.id}`)
      setPlantelDetalle((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          jugadores: prev.jugadores.filter((j) => j.id !== jugador.id),
        }
      })
      toast.success(`Jugador "${jugador.nombre}" removido del plantel`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo remover al jugador')
    } finally {
      setEliminandoJugadorId(null)
    }
  }

  const handleEliminarEquipo = async (equipo) => {
    const confirmar = window.confirm(
      `¿Dar de baja al equipo "${equipo.nombre}"?`,
    )
    if (!confirmar) return

    try {
      setEliminandoEquipo(true)
      await api.delete(`/equipos/${equipo.id}`)
      toast.success(`Equipo "${equipo.nombre}" dado de baja correctamente`)
      await cargarDatos(filtroTorneoId)
      if (selectedEquipoId === equipo.id) {
        cargarPlantel(equipo.id)
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo dar de baja al equipo')
    } finally {
      setEliminandoEquipo(false)
    }
  }

  const handleReactivarEquipo = async (equipo) => {
    const confirmar = window.confirm(
      `¿Reactivar al equipo "${equipo.nombre}"?`,
    )
    if (!confirmar) return

    try {
      setReactivandoEquipo(true)
      await api.patch(`/equipos/${equipo.id}/reactivar`)
      toast.success(`Equipo "${equipo.nombre}" reactivado exitosamente`)
      await cargarDatos(filtroTorneoId)
      if (selectedEquipoId === equipo.id) {
        cargarPlantel(equipo.id)
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo reactivar al equipo')
    } finally {
      setReactivandoEquipo(false)
    }
  }

  const equiposFiltrados = equipos.filter((eq) => {
    if (filtroEstadoEquipo === 'activos' && eq.activo === false) return false
    if (filtroEstadoEquipo === 'inactivos' && eq.activo !== false) return false
    if (!busquedaEquipo.trim()) return true
    const q = busquedaEquipo.toLowerCase()
    return eq.nombre.toLowerCase().includes(q) || String(eq.id).includes(q)
  })

  const equipoSeleccionadoObj = equipos.find((e) => e.id === selectedEquipoId)

  if (loading) return <Spinner label="Cargando equipos y torneos..." />

  return (
    <div className="flex flex-col gap-4 font-sans text-xs">
      {/* Barra superior: Título y Acciones de creación */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold uppercase tracking-wider text-text">
            Equipos y Planteles
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Administrá los clubes participantes, planteles oficiales y las listas de jugadores.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEquipoAEditar(null)
            setModalEquipoAbierto(true)
          }}
          className="h-9 px-4 w-full sm:w-auto rounded-xl border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 font-display font-bold text-xs uppercase active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
        >
          <span className="text-sm font-bold leading-none">+</span>
          <span>Nuevo Equipo</span>
        </button>
      </div>

      {/* Filtros de Torneo, Estado y Buscador */}
      <div className={`flex-col lg:flex-row lg:items-center justify-between gap-3 ${vistaMobile === 'detalle' ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Selector de Torneo */}
          <div className="flex items-center gap-2 bg-surface px-3 py-1 rounded-xl border border-border">
            <label className="font-display font-bold text-text-muted uppercase text-xs shrink-0">Torneo:</label>
            <select
              value={filtroTorneoId}
              onChange={(e) => handleCambiarFiltroTorneo(e.target.value)}
              className="h-8 px-2 w-full sm:w-auto rounded-lg border border-transparent bg-transparent text-xs font-semibold text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors cursor-pointer"
            >
              <option value="all">Todas las categorías y torneos</option>
              {torneos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} - {t.categoria} ({t.temporada})
                </option>
              ))}
            </select>
          </div>

          {/* Filtros de Estado */}
          <div className="flex w-full sm:w-auto overflow-x-auto rounded-xl border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setFiltroEstadoEquipo('todos')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors border text-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                filtroEstadoEquipo === 'todos'
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                  : 'text-text-muted hover:text-text border-transparent'
              }`}
            >
              <span>Todos</span>
              <span className="opacity-80">({equipos.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstadoEquipo('activos')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors border text-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                filtroEstadoEquipo === 'activos'
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                  : 'text-text-muted hover:text-text border-transparent'
              }`}
            >
              <span>Activos</span>
              <span className="opacity-80">({equipos.filter((e) => e.activo !== false).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstadoEquipo('inactivos')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors border text-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                filtroEstadoEquipo === 'inactivos'
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                  : 'text-text-muted hover:text-text border-transparent'
              }`}
            >
              <span>Bajas</span>
              <span className="opacity-80">({equipos.filter((e) => e.activo === false).length})</span>
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar equipo por nombre…"
            value={busquedaEquipo}
            onChange={(e) => setBusquedaEquipo(e.target.value)}
            className="h-9 px-3 w-full sm:w-64 rounded-xl border border-border bg-surface text-xs text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
          />
          {busquedaEquipo && (
            <button
              type="button"
              onClick={() => setBusquedaEquipo('')}
              className="text-xs text-text-muted hover:text-text px-2 py-1 shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500 rounded"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Contenido Principal: Grid de 2 columnas */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* Columna Izquierda: Lista de Equipos */}
        <div
          className={`${vistaMobile === 'detalle' ? 'hidden md:flex' : 'flex'
            } md:col-span-5 lg:col-span-4 flex-col gap-2.5`}
        >

          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Equipos ({equiposFiltrados.length})
            </span>
          </div>

          <div className="flex flex-col gap-1.5 max-h-[560px] overflow-y-auto pr-1">
            {equiposFiltrados.length === 0 ? (
              <div className="p-5 rounded-xl border border-border bg-surface text-center text-text-muted">
                <p className="text-xs">No se encontraron equipos con los filtros seleccionados.</p>
                {filtroEstadoEquipo !== 'todos' && (
                  <button
                    type="button"
                    onClick={() => {
                      setFiltroEstadoEquipo('todos')
                      setBusquedaEquipo('')
                    }}
                    className="mt-2 text-xs font-bold text-amber-500 hover:underline"
                  >
                    Mostrar todos los equipos
                  </button>
                )}
              </div>
            ) : (
              equiposFiltrados.map((eq) => {
                const activo = eq.id === selectedEquipoId
                const esDadoDeBaja = eq.activo === false
                const fallbackLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  eq.nombre,
                )}&background=F97316&color=fff&size=64`

                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => handleSeleccionarEquipo(eq)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${esDadoDeBaja
                      ? 'border-border/50 bg-surface/40 hover:bg-surface text-text-muted'
                      : activo
                        ? 'border-border bg-surface md:border-orange-500 md:bg-orange-500/10'
                        : 'border-border bg-surface hover:border-border/80 hover:bg-base'
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <EscudoEquipo
                        url={eq.escudo_url}
                        nombre={eq.nombre}
                        className={`h-9 w-9 shrink-0 ${esDadoDeBaja ? 'grayscale opacity-60' : ''
                          }`}
                      />
                      <div className="truncate">
                        <span
                          className={`block font-bold text-xs truncate ${esDadoDeBaja
                            ? 'text-text-muted line-through'
                            : activo
                              ? 'text-text md:text-orange-500'
                              : 'text-text'
                            }`}
                        >
                          {eq.nombre}
                        </span>
                        {esDadoDeBaja && (
                          <div className="mt-0.5">
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-danger/40 bg-danger/10 text-danger">
                              Baja
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Indicador en Desktop: Seleccionado / Ver */}
                    <span
                      className={`hidden md:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors ${
                        activo
                          ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                          : 'bg-base text-text-muted border-border'
                      }`}
                    >
                      {activo ? 'Seleccionado' : 'Ver'}
                    </span>

                    {/* Indicador en Móvil: Ver plantel → limpio y uniforme para todos los equipos */}
                    <span className="md:hidden inline-flex items-center gap-1 text-[11px] font-sans font-bold text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-lg">
                      Ver plantel
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Plantel del Equipo Seleccionado */}
        <div
          className={`${vistaMobile === 'lista' ? 'hidden md:flex' : 'flex'
            } md:col-span-7 lg:col-span-8 flex-col gap-3`}
        >
          {/* Botón Volver solo visible en móvil */}
          <div className="md:hidden flex items-center justify-between pb-1">
            <button
              type="button"
              onClick={handleVolverALista}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-500 hover:text-orange-400 bg-surface hover:bg-surface/80 px-3.5 py-2 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <span>Volver a lista de equipos</span>
            </button>
            <span className="text-[11px] font-semibold text-text-muted uppercase">
              Ficha del Club
            </span>
          </div>
          {selectedEquipoId && equipoSeleccionadoObj ? (
            <div data-ui="admin-table" className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
              {/* Encabezado del Equipo */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <EscudoEquipo
                    url={plantelDetalle?.escudo_url || equipoSeleccionadoObj.escudo_url}
                    nombre={equipoSeleccionadoObj.nombre}
                    className="h-12 w-12 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-text font-display uppercase tracking-wide truncate">
                        {equipoSeleccionadoObj.nombre}
                      </h3>
                      {equipoSeleccionadoObj.activo === false ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-danger/40 bg-danger/10 text-danger shrink-0">
                          Dado de baja
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shrink-0">
                          Activo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-text-muted mt-0.5 flex-wrap">
                      <span className="whitespace-nowrap tabular-nums">
                        {plantelDetalle?.jugadores?.length || 0} jugadores
                      </span>
                      {plantelDetalle && (
                        <>
                          <span className="text-border select-none">·</span>
                          <span className="whitespace-nowrap font-medium text-text tabular-nums">
                            {plantelDetalle.pj} PJ <span className="text-text-muted font-normal text-[10px]">({plantelDetalle.pg} PG - {plantelDetalle.pp} PP)</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones para el equipo: Inscribir Jugador y Dar de baja o Reactivar */}
                <div className="flex items-center gap-1.5 sm:gap-2 w-full xl:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setEquipoAEditar(equipoSeleccionadoObj)
                      setModalEquipoAbierto(true)
                    }}
                    className="flex-1 sm:flex-initial whitespace-nowrap h-8 px-2 sm:px-3 rounded-lg border border-border bg-surface hover:border-orange-500/50 hover:text-orange-500 text-text text-[11px] sm:text-xs font-semibold transition-colors inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    title="Editar nombre y escudo del club"
                  >
                    Editar
                  </button>

                  {equipoSeleccionadoObj.activo !== false ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setJugadorAEditar(null)
                          setModalJugadorAbierto(true)
                        }}
                        className="flex-1 sm:flex-initial whitespace-nowrap h-8 px-2.5 sm:px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-display font-bold text-xs uppercase active:scale-95 transition-colors inline-flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                      >
                        <span className="font-bold text-sm leading-none">+</span>
                        <span className="hidden sm:inline">Inscribir Jugador</span>
                        <span className="sm:hidden">Inscribir</span>
                      </button>

                      <button
                        type="button"
                        disabled={eliminandoEquipo}
                        onClick={() => handleEliminarEquipo(equipoSeleccionadoObj)}
                        className="flex-1 sm:flex-initial whitespace-nowrap h-8 px-2 sm:px-3 rounded-lg border border-border bg-surface hover:border-danger/50 hover:text-danger text-text-muted text-[11px] sm:text-xs font-semibold transition-colors disabled:opacity-50 inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                        title="Dar de baja al equipo"
                      >
                        Dar de baja
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={reactivandoEquipo}
                      onClick={() => handleReactivarEquipo(equipoSeleccionadoObj)}
                      className="flex-1 sm:flex-initial whitespace-nowrap h-8 px-2.5 sm:px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      title="Reactivar al equipo"
                    >
                      <span className="hidden sm:inline">Reactivar Equipo</span>
                      <span className="sm:hidden">Reactivar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Alerta si el equipo está dado de baja */}
              {equipoSeleccionadoObj.activo === false && (
                <div className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2 text-xs text-danger flex items-center justify-between">
                  <span>Este equipo se encuentra actualmente dado de baja en el sistema.</span>
                  <button
                    type="button"
                    disabled={reactivandoEquipo}
                    onClick={() => handleReactivarEquipo(equipoSeleccionadoObj)}
                    className="text-xs font-bold underline hover:no-underline ml-2"
                  >
                    Reactivar ahora
                  </button>
                </div>
              )}

              {/* Lista o Tabla de Jugadores */}
              <div>
                {loadingPlantel ? (
                  <div className="py-8">
                    <Spinner label="Cargando lista de de jugadores..." />
                  </div>
                ) : !plantelDetalle?.jugadores || plantelDetalle.jugadores.length === 0 ? (
                  <div className="py-10 px-4 text-center rounded-xl border border-dashed border-border bg-base flex flex-col items-center gap-2">
                    <p className="text-text-muted text-xs">
                      Este equipo aún no tiene jugadores inscriptos.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setJugadorAEditar(null)
                        setModalJugadorAbierto(true)
                      }}
                      className="text-xs font-bold text-orange-500 hover:underline"
                    >
                      Inscribir el primer jugador
                    </button>
                  </div>
                ) : (
                  <div data-ui="admin-table" className="overflow-hidden rounded-xl border border-border bg-surface">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead data-ui="table-head" className="border-b border-border/80 bg-surface/80 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                          <tr>
                            <th className="py-2.5 px-3 w-14 text-center">#</th>
                            <th className="py-2.5 px-3">Jugador</th>
                            <th className="py-2.5 px-4 w-36 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody data-ui="table-body" className="divide-y divide-border/40">
                          {plantelDetalle.jugadores.map((j) => (
                            <tr
                              key={j.id}
                              className="hover:bg-page/40 transition-colors"
                            >
                              <td className="py-2.5 px-3 text-center tabular-nums font-bold text-orange-500">
                                {j.numero !== null && j.numero !== undefined ? j.numero : '-'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-semibold text-text">
                                  {j.nombre}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleAbrirEditarJugador(j)}
                                    className="h-7 px-2.5 rounded-lg border border-border bg-surface text-xs font-semibold text-text hover:border-orange-500/50 hover:text-orange-500 transition-colors inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    disabled={eliminandoJugadorId === j.id}
                                    onClick={() => handleEliminarJugador(j)}
                                    className="h-7 px-2.5 rounded-lg border border-border bg-surface text-xs font-semibold text-text-muted hover:border-danger/50 hover:text-danger transition-colors inline-flex items-center justify-center disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-danger"
                                  >
                                    {eliminandoJugadorId === j.id ? '...' : 'Quitar'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface p-8 text-center text-text-muted text-xs">
              Seleccioná un equipo de la lista para ver sus jugadores.
            </div>
          )}
        </div>
      </div>


      {/* Modal para Crear / Editar Equipo */}
      <ModalCrearEquipo
        isOpen={modalEquipoAbierto}
        onClose={() => {
          setModalEquipoAbierto(false)
          setEquipoAEditar(null)
        }}
        onEquipoCreado={handleEquipoCreado}
        onEquipoGuardado={handleEquipoActualizado}
        equipoAEditar={equipoAEditar}
        torneos={torneos}
        defaultTorneoId={filtroTorneoId !== 'all' ? filtroTorneoId : ''}
      />

      {/* Modal para Inscribir o Editar Jugador */}
      {selectedEquipoId && equipoSeleccionadoObj && (
        <ModalInscribirJugador
          isOpen={modalJugadorAbierto}
          onClose={() => {
            setModalJugadorAbierto(false)
            setJugadorAEditar(null)
          }}
          onJugadorCreado={handleJugadorCreado}
          onJugadorActualizado={handleJugadorActualizado}
          jugadorAEditar={jugadorAEditar}
          equipoId={selectedEquipoId}
          equipoNombre={equipoSeleccionadoObj.nombre}
        />
      )}
    </div>
  )
}
