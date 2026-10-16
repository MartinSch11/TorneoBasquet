import { useEffect, useState } from 'react'
import api from '../../services/api'
import Spinner from '../ui/Spinner'
import { useToast } from '../../context/ToastContext'
import ModalCrearSponsor from './ModalCrearSponsor'

export default function GestionSponsors() {
  const { toast } = useToast()
  const [sponsors, setSponsors] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [sponsorAEditar, setSponsorAEditar] = useState(null)
  const [procesandoId, setProcesandoId] = useState(null)

  const cargarSponsors = async () => {
    try {
      setLoading(true)
      const res = await api.get('/sponsors?todos=true')
      setSponsors(res.data)
    } catch (err) {
      toast.error('Error al cargar la lista de sponsors.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarSponsors()
  }, [])

  const handleAbrirCrear = () => {
    setSponsorAEditar(null)
    setModalAbierto(true)
  }

  const handleAbrirEditar = (sponsor) => {
    setSponsorAEditar(sponsor)
    setModalAbierto(true)
  }

  const handleToggleActivo = async (sponsor) => {
    setProcesandoId(sponsor.id)
    try {
      const nuevoEstado = !sponsor.activo
      await api.patch(`/sponsors/${sponsor.id}`, { activo: nuevoEstado })
      toast.success(`Sponsor "${sponsor.nombre}" ${nuevoEstado ? 'activado' : 'inactivado'} correctamente.`)
      await cargarSponsors()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo cambiar el estado del sponsor.')
    } finally {
      setProcesandoId(null)
    }
  }

  const handleEliminarSponsor = async (sponsor) => {
    const confirmar = window.confirm(`¿Eliminar definitivamente el sponsor "${sponsor.nombre}"?`)
    if (!confirmar) return

    setProcesandoId(sponsor.id)
    try {
      await api.delete(`/sponsors/${sponsor.id}`)
      toast.success(`Sponsor "${sponsor.nombre}" eliminado correctamente.`)
      await cargarSponsors()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo eliminar el sponsor.')
    } finally {
      setProcesandoId(null)
    }
  }

  const sponsorsFiltrados = sponsors.filter((s) => {
    if (filtroEstado === 'activos' && !s.activo) return false
    if (filtroEstado === 'inactivos' && s.activo) return false
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      s.nombre.toLowerCase().includes(q) ||
      (s.url_sitio && s.url_sitio.toLowerCase().includes(q))
    )
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Control Superior */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border shadow-xs">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold uppercase tracking-wider text-text">
            Sponsors y Auspiciantes
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Gestioná las marcas y anunciantes oficiales que se exhiben en la portada y el carrusel de la liga.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAbrirCrear}
          className="h-9 px-4 rounded-xl border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 font-display font-bold text-xs uppercase active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
        >
          <span className="text-sm font-bold leading-none">+</span>
          <span>Nuevo Sponsor</span>
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
            <span className="opacity-80 tabular-nums">({sponsors.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('activos')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors border text-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              filtroEstado === 'activos'
                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                : 'text-text-muted hover:text-text border-transparent'
            }`}
          >
            <span>Activos</span>
            <span className="opacity-80 tabular-nums">({sponsors.filter((s) => s.activo).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('inactivos')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors border text-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              filtroEstado === 'inactivos'
                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                : 'text-text-muted hover:text-text border-transparent'
            }`}
          >
            <span>Inactivos</span>
            <span className="opacity-80 tabular-nums">({sponsors.filter((s) => !s.activo).length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar sponsor por nombre o enlace…"
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

      {/* Tabla de Sponsors */}
      {loading ? (
        <div className="p-8">
          <Spinner label="Cargando auspiciantes…" />
        </div>
      ) : sponsorsFiltrados.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-border bg-surface text-text-muted text-xs">
          {busqueda
            ? 'No se encontraron auspiciantes que coincidan con la búsqueda.'
            : 'No hay sponsors registrados. Agregá el primero con el botón superior.'}
        </div>
      ) : (
        <div data-ui="admin-table-container" className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table data-ui="admin-table" className="w-full text-left text-xs">
              <thead data-ui="admin-thead" className="border-b border-border/80 bg-surface/80 text-[11px] font-bold uppercase text-text-muted">
                <tr>
                  <th scope="col" className="py-3 px-4">Marca / Empresa</th>
                  <th scope="col" className="py-3 px-3">Sitio Web</th>
                  <th scope="col" className="py-3 px-3 text-center">Orden</th>
                  <th scope="col" className="py-3 px-3 text-center">Estado</th>
                  <th scope="col" className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody data-ui="admin-tbody" className="divide-y divide-border/40">
                {sponsorsFiltrados.map((s) => (
                  <tr key={s.id} className="hover:bg-page/40 transition-colors" data-ui="admin-tr">
                    {/* Marca / Logo */}
                    <td className="py-3.5 px-4 font-semibold text-text text-sm">
                      <div className="flex items-center gap-3">
                        <img
                          src={s.logo_url}
                          alt={s.nombre}
                          width="36"
                          height="36"
                          loading="lazy"
                          className="h-9 w-9 rounded-lg object-contain bg-base border border-border p-1 shrink-0"
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                        <span className="font-semibold text-text text-xs">{s.nombre}</span>
                      </div>
                    </td>

                    {/* Sitio Web */}
                    <td className="py-3.5 px-3 text-text-muted">
                      {s.url_sitio ? (
                        <a
                          href={s.url_sitio}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-orange-600 dark:text-orange-400 hover:underline max-w-[200px] truncate block font-medium"
                        >
                          {s.url_sitio.replace(/^https?:\/\//, '')}
                        </a>
                      ) : (
                        <span className="text-xs text-text-muted/60">—</span>
                      )}
                    </td>

                    {/* Orden */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold tabular-nums bg-base border border-border text-orange-600 dark:text-orange-400">
                        {s.orden}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          s.activo
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30'
                        }`}
                      >
                        {s.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAbrirEditar(s)}
                          className="h-7 px-2.5 rounded-lg border border-border bg-surface text-xs font-semibold text-text hover:border-amber-500/50 hover:text-amber-500 transition-colors inline-flex items-center justify-center"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActivo(s)}
                          disabled={procesandoId === s.id}
                          className={`h-7 px-2.5 rounded-lg border text-xs font-semibold transition-colors inline-flex items-center justify-center ${
                            s.activo
                              ? 'border-border bg-surface text-text-muted hover:border-danger/50 hover:text-danger'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          {procesandoId === s.id ? '...' : s.activo ? 'Inactivar' : 'Activar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminarSponsor(s)}
                          disabled={procesandoId === s.id}
                          className="h-7 px-2.5 rounded-lg border border-border bg-surface text-xs font-semibold text-text-muted hover:border-danger/50 hover:text-danger transition-colors inline-flex items-center justify-center disabled:opacity-50"
                        >
                          Eliminar
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
      <ModalCrearSponsor
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        sponsorAEditar={sponsorAEditar}
        onSponsorGuardado={() => {
          toast.success(sponsorAEditar ? 'Sponsor actualizado con éxito.' : 'Sponsor registrado con éxito.')
          cargarSponsors()
        }}
      />
    </div>
  )
}
