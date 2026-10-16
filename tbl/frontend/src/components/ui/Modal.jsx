import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from './Icon'
import useBodyLock from '../../hooks/useBodyLock'

export default function Modal({ titulo, onClose, children, maxWidth = 'max-w-md' }) {
  useBodyLock(true)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div
      data-ui="modal"
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-150 touch-none overscroll-contain"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        data-ui="modal-content"
        className={`relative z-[1000000] w-full ${maxWidth} max-h-[92vh] flex flex-col rounded-2xl border border-border bg-surface text-text p-4 sm:p-5 shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden touch-auto overscroll-contain`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 shrink-0 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold uppercase tracking-wide text-text text-balance">{titulo}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 min-w-0 min-h-0 place-items-center rounded-xl border border-border bg-page text-text-muted hover:border-orange-500 hover:text-orange-500 active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Cerrar ventana emergente"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}