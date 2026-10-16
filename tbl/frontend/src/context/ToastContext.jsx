import { createContext, useContext, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removerToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const agregarToast = useCallback(
    ({ tipo = 'success', mensaje, titulo = '', duracion = 4500 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const nuevo = { id, tipo, mensaje, titulo }

      setToasts((prev) => [...prev, nuevo])

      if (duracion > 0) {
        setTimeout(() => {
          removerToast(id)
        }, duracion)
      }

      return id
    },
    [removerToast],
  )

  const toast = {
    success: (mensaje, titulo) =>
      agregarToast({ tipo: 'success', mensaje, titulo: titulo ?? 'Operación exitosa' }),
    error: (mensaje, titulo) =>
      agregarToast({ tipo: 'error', mensaje, titulo: titulo ?? 'Error' }),
    warning: (mensaje, titulo) =>
      agregarToast({ tipo: 'warning', mensaje, titulo: titulo ?? 'Atención' }),
    info: (mensaje, titulo) =>
      agregarToast({ tipo: 'info', mensaje, titulo: titulo ?? 'Información' }),
    custom: agregarToast,
    dismiss: removerToast,
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            data-ui="toast-container"
            className="fixed top-16 right-4 sm:right-6 z-[999999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
            aria-live="polite"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                data-ui="toast-item"
                className={`pointer-events-auto rounded-xl border bg-surface p-3.5 shadow-2xl flex items-start gap-3 transition-opacity transition-transform duration-200 animate-in slide-in-from-top-3 fade-in ${
                  t.tipo === 'success'
                    ? 'border-emerald-500/30'
                    : t.tipo === 'error'
                      ? 'border-rose-500/30'
                      : t.tipo === 'warning'
                        ? 'border-amber-500/30'
                        : 'border-sky-500/30'
                }`}
              >
                {/* Icono temático estilo Filament */}
                {t.tipo === 'success' && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {t.tipo === 'error' && (
                  <div className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                {t.tipo === 'warning' && (
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                )}
                {t.tipo === 'info' && (
                  <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-500 border border-sky-500/30 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}

                {/* Contenido textual */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  {t.titulo && (
                    <span className="font-display font-bold uppercase tracking-wider text-[11px] text-text">
                      {t.titulo}
                    </span>
                  )}
                  <p className="text-text-muted text-xs leading-relaxed font-sans break-words">
                    {t.mensaje}
                  </p>
                </div>

                {/* Botón de cierre */}
                <button
                  type="button"
                  onClick={() => removerToast(t.id)}
                  className="text-text-muted hover:text-text p-1 rounded-md hover:bg-page transition-colors shrink-0 -mr-1 -mt-1 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
                  aria-label="Cerrar notificación"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de un ToastProvider')
  }
  return context
}
