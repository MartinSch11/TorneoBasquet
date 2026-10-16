import { useEffect, useState } from 'react'
import api from '../../services/api'
import Spinner from '../ui/Spinner'
import { useToast } from '../../context/ToastContext'
import ModalCrearCancha from './ModalCrearCancha'

export default function GestionCanchas() {
  const { toast } = useToast()
  const [canchas, setCanchas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [canchaAEditar, setCanchaAEditar] = useState(null)
  const [procesandoId, setProcesandoId] = useState(null)

  const cargarCanchas = async () => {
    try {
      setLoading(true)
      const res = await api.get('/canchas?todas=true')
      setCanchas(res.data)
    } catch (err) {
      toast.error('Error al cargar el listado de canchas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarCanchas()
  }, [])

  const handleAbrirCrear = () => {
    setCanchaAEditar(null)
    setModalAbierto(true)
  }

  const handleAbrirEditar = (cancha) => {
    setCanchaAEditar(cancha)
    setModalAbierto(true)
  }

  const handleToggleActivo = async (cancha) => {
    setProcesandoId(cancha.id)
    try {
      const nuevoEstado = !cancha.activo
      await api.patch(`/canchas/${cancha.id}`, { activo: nuevoEstado })
      toast.success(`Cancha '${cancha.nombre}' ${nuevoEstado ? 'activada' : 'inactivada'} correctamente.`)
      await cargarCanchas()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo actualizar el estado de la cancha.')
    } finally {
      setProcesandoId(null)
    }
  }

  const canchasFiltradas = canchas.filter((c) => {
    if (filtroEstado === 'activas' && !c.activo) return false
    if (filtroEstado === 'inactivas' && c.activo) return false
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      c.nombre.toLowerCase().includes(q) ||
      (c.direccion && c.direccion.toLowerCase().includes(q)) ||
      (c.ciudad && c.ciudad.toLowerCase().includes(q))
    )
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Control Superior */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border shadow-xs">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold uppercase tracking-wider text-text">
            Sedes y Canchas Oficiales
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Gestioná las canchas habilitadas para la disputa de partidos oficiales de la liga.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAbrirCrear}
          className="h-9 px-4 rounded-xl border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 font-display font-bold text-xs uppercase active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
        >
          <span className="text-sm font-bold leading-none">+</span>
          <span>Nueva Cancha</span>
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
            <span>Todas</span>
            <span className="opacity-80 tabular-nums">({canchas.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('activas')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors border text-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              filtroEstado === 'activas'
                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                : 'text-text-muted hover:text-text border-transparent'
            }`}
          >
            <span>Activas</span>
            <span className="opacity-80 tabular-nums">({canchas.filter((c) => c.activo).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('inactivas')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors border text-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              filtroEstado === 'inactivas'
                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                : 'text-text-muted hover:text-text border-transparent'
            }`}
          >
            <span>Inactivas</span>
            <span className="opacity-80 tabular-nums">({canchas.filter((c) => !c.activo).length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            name="busqueda"
            aria-label="Buscar canchas"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre de cancha, dirección o ciudad…"
            className="h-9 px-3 w-full sm:w-64 rounded-xl border border-border bg-surface text-xs text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="text-xs text-text-muted hover:text-text px-2 py-1 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Canchas */}
      {loading ? (
        <div className="p-8">
          <Spinner label="Cargando canchas oficiales…" />
        </div>
      ) : canchasFiltradas.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-border bg-surface text-text-muted text-xs">
          {busqueda
            ? 'No se encontraron canchas que coincidan con la búsqueda.'
            : 'No hay canchas registradas en el sistema. Creá la primera con el botón superior.'}
        </div>
      ) : (
        <div data-ui="admin-table-container" className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table data-ui="admin-table" className="w-full text-left text-xs">
              <thead data-ui="admin-thead" className="border-b border-border/80 bg-surface/80 text-[11px] font-bold uppercase text-text-muted">
                <tr>
                  <th scope="col" className="py-3 px-4">Cancha</th>
                  <th scope="col" className="py-3 px-3">Dirección / Sede</th>
                  <th scope="col" className="py-3 px-3 text-center">Partidos</th>
                  <th scope="col" className="py-3 px-3 text-center">Estado</th>
                  <th scope="col" className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody data-ui="admin-tbody" className="divide-y divide-border/40">
                {canchasFiltradas.map((c) => (
                  <tr key={c.id} className="hover:bg-page/40 transition-colors" data-ui="admin-tr">
                    {/* Nombre */}
                    <td className="py-3.5 px-4 font-semibold text-text text-sm">
                      {c.nombre}
                    </td>

                    {/* Dirección y Ciudad */}
                    <td className="py-3.5 px-3 text-text-muted">
                      <div className="font-medium text-text/90">{c.direccion || '—'}</div>
                      <div className="text-[10px] uppercase font-semibold text-text-muted/70">
                        {c.ciudad || 'Córdoba'}
                      </div>
                    </td>

                    {/* Conteo de Partidos */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold tabular-nums bg-base border border-border text-orange-600 dark:text-orange-400">
                        {c.partidos_count}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          c.activo
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30'
                        }`}
                      >
                        {c.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAbrirEditar(c)}
                          className="h-7 px-2.5 rounded-lg border border-border bg-surface text-xs font-semibold text-text hover:border-amber-500/50 hover:text-amber-500 transition-colors inline-flex items-center justify-center"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActivo(c)}
                          disabled={procesandoId === c.id}
                          className={`h-7 px-2.5 rounded-lg border text-xs font-semibold transition-colors inline-flex items-center justify-center ${
                            c.activo
                              ? 'border-border bg-surface text-text-muted hover:border-danger/50 hover:text-danger'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          {procesandoId === c.id
                            ? '...'
                            : c.activo
                            ? 'Inactivar'
                            : 'Activar'}
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

      {/* Modal Crear / Editar */}
      <ModalCrearCancha
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        canchaAEditar={canchaAEditar}
        onCanchaGuardada={() => {
          toast.success(canchaAEditar ? 'Cancha actualizada correctamente.' : 'Cancha registrada con éxito.')
          cargarCanchas()
        }}
      />
    </div>
  )
}
