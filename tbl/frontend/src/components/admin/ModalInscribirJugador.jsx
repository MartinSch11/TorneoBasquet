import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import api from '../../services/api'
import { IconClose } from '../ui/Icon'

export default function ModalInscribirJugador({
  isOpen,
  onClose,
  onJugadorCreado,
  onJugadorActualizado,
  jugadorAEditar = null,
  equipoId = null,
  equipoNombre = '',
  equipos = [],
  defaultEquipoId = null,
}) {
  const [selectedEquipoId, setSelectedEquipoId] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [numero, setNumero] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (jugadorAEditar) {
        setNombre(
          jugadorAEditar.nombre_pila ||
          (jugadorAEditar.nombre ? jugadorAEditar.nombre.split(' ')[0] : ''),
        )
        setApellido(
          jugadorAEditar.apellido ||
          (jugadorAEditar.nombre && jugadorAEditar.nombre.includes(' ')
            ? jugadorAEditar.nombre.split(' ').slice(1).join(' ')
            : ''),
        )
        setNumero(
          jugadorAEditar.numero !== null && jugadorAEditar.numero !== undefined
            ? String(jugadorAEditar.numero)
            : '',
        )
      } else {
        setNombre('')
        setApellido('')
        setNumero('')
      }
      setError('')
      setGuardando(false)

      if (defaultEquipoId) {
        setSelectedEquipoId(defaultEquipoId)
      } else if (equipoId) {
        setSelectedEquipoId(equipoId)
      } else if (equipos.length > 0) {
        setSelectedEquipoId(equipos[0].id)
      } else {
        setSelectedEquipoId('')
      }
    }
  }, [isOpen, jugadorAEditar, defaultEquipoId, equipoId, equipos])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !guardando) {
        e.stopPropagation()
        e.stopImmediatePropagation()
        onClose?.()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [isOpen, guardando, onClose])

  if (!isOpen) return null

  const blockNonNumeric = (e) => {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
      e.preventDefault()
    }
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setError('')

    const targetEquipoId = selectedEquipoId || equipoId
    if (!targetEquipoId) {
      setError('Debes seleccionar un equipo')
      return
    }

    if (!apellido.trim()) {
      setError('El apellido es obligatorio')
      return
    }

    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    const numInt = numero === '' ? null : parseInt(numero, 10)
    if (numInt !== null && (isNaN(numInt) || numInt < 0 || numInt > 99)) {
      setError('El dorsal debe ser un número entre 0 y 99')
      return
    }

    try {
      setGuardando(true)
      if (jugadorAEditar) {
        const res = await api.patch(
          `/equipos/${targetEquipoId}/jugadores/${jugadorAEditar.id}`,
          {
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            numero: numInt,
          },
        )
        if (onJugadorActualizado) {
          onJugadorActualizado(res.data)
        }
      } else {
        const res = await api.post(`/equipos/${targetEquipoId}/jugadores`, {
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          numero: numInt,
        })
        if (onJugadorCreado) {
          onJugadorCreado(res.data, targetEquipoId)
        }
      }
      onClose?.()
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        (jugadorAEditar
          ? 'Error al actualizar el jugador'
          : 'Error al inscribir el jugador'),
      )
    } finally {
      setGuardando(false)
    }
  }

  const esEdicion = Boolean(jugadorAEditar)

  return createPortal(
    <div
      data-ui="modal-overlay"
      className="fixed inset-0 z-[1000010] flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200"
      onClick={() => {
        if (!guardando) onClose?.()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={esEdicion ? 'Editar Jugador' : 'Inscribir Jugador'}
    >
      <div
        data-ui="modal"
        className="relative z-[1000020] w-full max-w-md rounded-2xl border border-border bg-surface text-text p-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div data-ui="modal-header" className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div>
            <h3 className="font-bold text-base text-text uppercase tracking-wider font-display">
              {esEdicion ? 'Editar Jugador' : 'Inscribir Jugador'}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {esEdicion ? 'Modificá los datos del jugador.' : 'Agregá un nuevo jugador al plantel oficial.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-border bg-base text-text-muted hover:text-orange-500 hover:border-orange-500/40 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Cerrar modal"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2 text-xs font-medium text-danger">
              {error}
            </div>
          )}

          {/* Selección o visualización de equipo */}
          {equipos.length === 2 && !esEdicion ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Equipo Destino
              </label>
              <div className="grid grid-cols-2 gap-2">
                {equipos.map((eq) => {
                  const seleccionado = String(selectedEquipoId) === String(eq.id)
                  return (
                    <button
                      key={eq.id}
                      type="button"
                      onClick={() => setSelectedEquipoId(eq.id)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${seleccionado
                          ? 'bg-orange-500/15 border-orange-500 text-orange-600 dark:text-orange-400'
                          : 'border-border bg-page text-text-muted hover:text-text'
                        }`}
                    >
                      {eq.sublabel && (
                        <span className="block text-[10px] uppercase font-semibold opacity-75">
                          {eq.sublabel}
                        </span>
                      )}
                      <span className="truncate block font-bold">{eq.nombre}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : equipos.length > 2 && !esEdicion ? (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Equipo Destino
              </label>
              <select
                value={selectedEquipoId}
                onChange={(e) => setSelectedEquipoId(e.target.value)}
                className="h-10 rounded-xl border border-border bg-page px-3 text-sm font-semibold text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              >
                {equipos.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.nombre}
                  </option>
                ))}
              </select>
            </div>
          ) : (equipoNombre || equipoId) ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-page text-xs">
              <span className="text-text-muted font-bold text-[10px] uppercase tracking-wider">
                Equipo
              </span>
              <span className="font-bold text-text truncate max-w-[200px]">
                {equipoNombre || `Equipo #${equipoId}`}
              </span>
            </div>
          ) : null}

          {/* Fila Dorsal y Apellido */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-1 flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Dorsal
              </label>
              <input
                type="number"
                min="0"
                max="99"
                placeholder="N°"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                onKeyDown={blockNonNumeric}
                className="h-10 px-1 text-center tabular-nums font-bold text-orange-500 rounded-xl border border-border bg-page outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 text-sm transition-colors"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Apellido <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Pérez"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                required
                autoFocus
                className="h-10 rounded-xl border border-border bg-page px-3 text-sm text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Nombre */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Nombre <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Juan"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="h-10 rounded-xl border border-border bg-page px-3 text-sm text-text outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
            />
          </div>

          {/* Botones de acción */}
          <div data-ui="modal-footer" className="mt-2 flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="h-9 px-4 rounded-xl border border-border bg-surface text-xs font-semibold text-text-muted hover:text-text transition-colors inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !nombre.trim() || !apellido.trim()}
              className="h-9 px-5 rounded-xl border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 font-display font-bold text-xs uppercase active:scale-95 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              {guardando
                ? 'Guardando...'
                : esEdicion
                  ? 'Guardar Cambios'
                  : 'Inscribir Jugador'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
