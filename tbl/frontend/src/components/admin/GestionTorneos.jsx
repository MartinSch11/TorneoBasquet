import { useEffect, useState } from 'react'
import api from '../../services/api'
import Spinner from '../ui/Spinner'
import { useToast } from '../../context/ToastContext'
import ModalCrearTorneo from './ModalCrearTorneo'
import ModalFinalizarTorneo from './ModalFinalizarTorneo'
import MenuAcciones from '../ui/MenuAcciones'
import { IconEdit, IconCheck, IconPlay, IconTrash } from '../ui/Icon'

export default function GestionTorneos() {
  const { toast } = useToast()
  const [torneos, setTorneos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [torneoAEditar, setTorneoAEditar] = useState(null)
  const [torneoAFinalizar, setTorneoAFinalizar] = useState(null)
  const [procesandoId, setProcesandoId] = useState(null)

  const cargarTorneos = async () => {
    try {
      setLoading(true)
      const res = await api.get('/torneos?todos=true')
      setTorneos(res.data)
    } catch (err) {
      toast.error('Error al cargar la lista de torneos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarTorneos()
  }, [])

  const handleAbrirCrear = () => {
    setTorneoAEditar(null)
    setModalAbierto(true)
  }

  const handleAbrirEditar = (torneo) => {
    setTorneoAEditar(torneo)
    setModalAbierto(true)
  }

  const handleToggleEstado = async (torneo, nuevoEstado) => {
    setProcesandoId(torneo.id)
    try {
      await api.patch(`/torneos/${torneo.id}`, { estado: nuevoEstado })
      toast.success(`Torneo "${torneo.nombre} - ${torneo.categoria}" actualizado a estado "${nuevoEstado}".`)
      await cargarTorneos()
    } catch (err) {
      const msg = err.response?.data?.detail || 'No se pudo actualizar el estado del torneo.'
      toast.error(msg)
      throw err
    } finally {
      setProcesandoId(null)
    }
  }

  const handleEliminarTorneo = async (torneo) => {
    const confirmar = window.confirm(
      `¿Dar de baja el torneo "${torneo.nombre} - ${torneo.categoria} (${torneo.temporada})"?`
    )
    if (!confirmar) return

    setProcesandoId(torneo.id)
    try {
      await api.delete(`/torneos/${torneo.id}`)
      toast.success(`Torneo "${torneo.nombre} - ${torneo.categoria}" marcado como inactivo.`)
      await cargarTorneos()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo dar de baja el torneo.')
    } finally {
      setProcesandoId(null)
    }
  }

  const torneosFiltrados = torneos.filter((t) => {
    if (filtroEstado !== 'todos' && t.estado !== filtroEstado) {
      return false
    }
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      t.nombre.toLowerCase().includes(q) ||
      t.categoria.toLowerCase().includes(q) ||
      t.temporada.toLowerCase().includes(q) ||
      (t.grupo && t.grupo.toLowerCase().includes(q))
    )
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Control Superior */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border shadow-xs">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold uppercase tracking-wider text-text">
            Torneos y Categorías
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Gestioná las divisiones (LBA A, B, C), temporadas, fases y estados de los torneos oficiales.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAbrirCrear}
          className="h-9 px-4 rounded-xl border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 font-display font-bold text-xs uppercase active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
        >
          <span className="text-sm font-bold leading-none">+</span>
          <span>Nuevo Torneo</span>
        </button>
      </div>

      {/* Filtros de Estado y Buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex w-full sm:w-auto overflow-x-auto rounded-xl border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setFiltroEstado('todos')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors border text-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              filtroEstado === 'todos'
                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                : 'text-text-muted hover:text-text border-transparent'
            }`}
          >
            <span>Todos</span>
            <span className="opacity-80 tabular-nums">({torneos.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('activo')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors border text-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              filtroEstado === 'activo'
                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                : 'text-text-muted hover:text-text border-transparent'
            }`}
          >
            <span>Activos</span>
            <span className="opacity-80 tabular-nums">({torneos.filter((t) => t.estado === 'activo').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('inscripcion')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors border text-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              filtroEstado === 'inscripcion'
                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                : 'text-text-muted hover:text-text border-transparent'
            }`}
          >
            <span>Inscripción</span>
            <span className="opacity-80 tabular-nums">({torneos.filter((t) => t.estado === 'inscripcion').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('finalizado')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors border text-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              filtroEstado === 'finalizado'
                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                : 'text-text-muted hover:text-text border-transparent'
            }`}
          >
            <span>Finalizados</span>
            <span className="opacity-80 tabular-nums">({torneos.filter((t) => t.estado === 'finalizado').length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por categoría, temporada o nombre…"
            className="h-9 px-3 w-full sm:w-64 rounded-xl border border-border bg-surface text-xs text-text outline-none focus:border-amber-500 transition-colors shadow-xs"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="text-xs text-text-muted hover:text-text px-2 py-1 shrink-0"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Torneos */}
      {loading ? (
        <div className="p-8">
          <Spinner label="Cargando torneos y categorías…" />
        </div>
      ) : torneosFiltrados.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-border bg-surface text-text-muted text-xs">
          {busqueda
            ? 'No se encontraron torneos que coincidan con la búsqueda.'
            : 'No hay torneos registrados. Creá el primero con el botón superior.'}
        </div>
      ) : (
        <div data-ui="admin-table-container" className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table data-ui="admin-table" className="w-full min-w-[640px] text-left text-xs">
              <thead data-ui="admin-thead" className="border-b border-border/80 bg-surface/80 text-[11px] font-bold uppercase text-text-muted">
                <tr>
                  <th scope="col" className="py-3 px-4">Torneo / Liga</th>
                  <th scope="col" className="py-3 px-3">Categoría / División</th>
                  <th scope="col" className="py-3 px-3 text-center">Temporada</th>
                  <th scope="col" className="py-3 px-3">Zona / Grupo</th>
                  <th scope="col" className="py-3 px-3 text-center">Estado</th>
                  <th scope="col" className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody data-ui="admin-tbody" className="divide-y divide-border/40">
                {torneosFiltrados.map((t) => (
                  <tr key={t.id} className="hover:bg-page/40 transition-colors" data-ui="admin-tr">
                    {/* Torneo / Liga */}
                    <td className="py-3.5 px-4 font-semibold text-text text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text text-xs uppercase font-display">
                          {t.nombre}
                        </span>
                        <span className="text-[10px] text-text-muted tabular-nums">
                          Ed. {t.edicion}
                        </span>
                      </div>
                    </td>

                    {/* Categoría */}
                    <td className="py-3.5 px-3">
                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] tabular-nums font-bold uppercase bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                        {t.categoria}
                      </span>
                    </td>

                    {/* Temporada */}
                    <td className="py-3 px-3 text-center tabular-nums font-semibold text-text text-xs">
                      {t.temporada}
                    </td>

                    {/* Grupo / Zona */}
                    <td className="py-3.5 px-3 text-text-muted">
                      {t.grupo ? (
                        <span className="tabular-nums text-xs text-text/80">{t.grupo}</span>
                      ) : (
                        <span className="text-xs text-text-muted/60">—</span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          t.estado === 'activo'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : t.estado === 'inscripcion'
                            ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                            : t.estado === 'finalizado'
                            ? 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {t.estado}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center">
                        <MenuAcciones
                          disabled={procesandoId === t.id}
                          acciones={[
                            {
                              label: 'Editar torneo',
                              icon: <IconEdit className="w-3.5 h-3.5 text-text-muted" />,
                              onClick: () => handleAbrirEditar(t),
                            },
                            ...(t.estado === 'activo'
                              ? [
                                  {
                                    label: 'Finalizar torneo',
                                    icon: <IconCheck className="w-3.5 h-3.5 text-orange-500" />,
                                    warning: true,
                                    onClick: () => setTorneoAFinalizar(t),
                                  },
                                ]
                              : []),
                            ...(t.estado !== 'activo' && t.estado !== 'inactivo'
                              ? [
                                  {
                                    label: 'Activar torneo',
                                    icon: <IconPlay className="w-3.5 h-3.5 text-emerald-500" />,
                                    success: true,
                                    onClick: () => handleToggleEstado(t, 'activo'),
                                  },
                                ]
                              : []),
                            {
                              label: 'Dar de baja',
                              icon: <IconTrash className="w-3.5 h-3.5 text-danger" />,
                              danger: true,
                              onClick: () => handleEliminarTorneo(t),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Torneo */}
      <ModalCrearTorneo
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        torneoAEditar={torneoAEditar}
        onTorneoGuardado={() => {
          toast.success(torneoAEditar ? 'Torneo actualizado exitosamente.' : 'Torneo creado exitosamente.')
          cargarTorneos()
        }}
      />

      {/* Modal Confirmar Finalización de Torneo */}
      <ModalFinalizarTorneo
        isOpen={Boolean(torneoAFinalizar)}
        torneo={torneoAFinalizar}
        onClose={() => setTorneoAFinalizar(null)}
        onConfirmar={async (torneo) => {
          await handleToggleEstado(torneo, 'finalizado')
        }}
      />
    </div>
  )
}
