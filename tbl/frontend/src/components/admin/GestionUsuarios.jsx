import { useEffect, useState } from 'react'
import api from '../../services/api'
import Spinner from '../ui/Spinner'
import { useToast } from '../../context/ToastContext'
import ModalCrearUsuario from './ModalCrearUsuario'

export default function GestionUsuarios() {
  const { toast } = useToast()
  const [usuarios, setUsuarios] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [procesandoId, setProcesandoId] = useState(null)

  const cargar = async () => {
    try {
      setLoading(true)
      const [resUsers, resMe] = await Promise.all([
        api.get('/auth/usuarios'),
        api.get('/auth/me').catch(() => ({ data: null })),
      ])
      setUsuarios(resUsers.data)
      if (resMe.data) setCurrentUser(resMe.data)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const handleUsuarioCreado = async (nuevo) => {
    toast.success(`Usuario "${nuevo.usuario}" creado exitosamente.`)
    await cargar()
  }

  const toggle = async (u) => {
    if (u.id === currentUser?.id && u.activo) {
      toast.error('No podés desactivar tu propia cuenta de administrador.')
      return
    }

    setProcesandoId(u.id)
    try {
      const nuevoEstado = !u.activo
      await api.patch(`/auth/usuarios/${u.id}`, { activo: nuevoEstado })
      toast.success(`Usuario "${u.usuario}" ${nuevoEstado ? 'activado' : 'desactivado'} correctamente.`)
      await cargar()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo cambiar el estado del usuario')
    } finally {
      setProcesandoId(null)
    }
  }

  const usuariosFiltrados = usuarios.filter((u) => {
    if (filtroEstado === 'activos' && !u.activo) return false
    if (filtroEstado === 'inactivos' && u.activo) return false
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return u.usuario.toLowerCase().includes(q) || u.rol.toLowerCase().includes(q)
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Control Superior */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border shadow-xs">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold uppercase tracking-wider text-text">
            Gestión de Usuarios
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Administrá las cuentas de acceso al sistema y sus permisos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="h-9 px-4 rounded-xl border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 font-display font-bold text-xs uppercase active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
        >
          <span className="text-sm font-bold leading-none">+</span>
          <span>Nuevo Usuario</span>
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
            <span className="opacity-80 tabular-nums">({usuarios.length})</span>
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
            <span className="opacity-80 tabular-nums">({usuarios.filter((u) => u.activo).length})</span>
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
            <span className="opacity-80 tabular-nums">({usuarios.filter((u) => !u.activo).length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre de usuario o rol…"
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

      {/* Tabla de Usuarios */}
      {loading ? (
        <div className="p-8">
          <Spinner label="Cargando usuarios…" />
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-border bg-surface text-text-muted text-xs">
          {busqueda
            ? 'No se encontraron usuarios que coincidan con la búsqueda.'
            : 'No hay usuarios registrados.'}
        </div>
      ) : (
        <div data-ui="admin-table-container" className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table data-ui="admin-table" className="w-full text-left text-xs">
              <thead data-ui="admin-thead" className="border-b border-border/80 bg-surface/80 text-[11px] font-bold uppercase text-text-muted">
                <tr>
                  <th scope="col" className="py-3 px-4">Usuario</th>
                  <th scope="col" className="py-3 px-3">Rol</th>
                  <th scope="col" className="py-3 px-3 text-center">Estado</th>
                  <th scope="col" className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody data-ui="admin-tbody" className="divide-y divide-border/40">
                {usuariosFiltrados.map((u) => (
                  <tr key={u.id} className="hover:bg-page/40 transition-colors" data-ui="admin-tr">
                    <td className="py-3.5 px-4 font-semibold text-text text-sm">
                      <div className="flex items-center gap-2">
                        <span>{u.usuario}</span>
                        {currentUser?.id === u.id && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                            Vos
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          u.rol === 'admin'
                            ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30'
                            : 'bg-base text-text-muted border-border'
                        }`}
                      >
                        {u.rol}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          u.activo
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30'
                        }`}
                      >
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {currentUser?.id === u.id ? (
                        <span className="text-[11px] text-text-muted italic px-2">Sesión actual</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggle(u)}
                          disabled={procesandoId === u.id}
                          className={`h-7 px-2.5 rounded-lg border text-xs font-semibold transition-colors inline-flex items-center justify-center cursor-pointer ${
                            u.activo
                              ? 'border-border bg-surface text-text-muted hover:border-danger/50 hover:text-danger'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          {procesandoId === u.id
                            ? '...'
                            : u.activo
                            ? 'Desactivar'
                            : 'Activar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ModalCrearUsuario
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onUsuarioCreado={handleUsuarioCreado}
      />
    </div>
  )
}
