import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconDotsVertical } from './Icon'

export default function MenuAcciones({ acciones = [], disabled = false }) {
  const [abierto, setAbierto] = useState(false)
  const [posicion, setPosicion] = useState({ top: 0, right: 0, abrirArriba: false })
  const botonRef = useRef(null)
  const menuRef = useRef(null)

  const actualizarPosicion = () => {
    if (!botonRef.current) return
    const rect = botonRef.current.getBoundingClientRect()
    const altoMenuEstimado = acciones.length * 36 + 16
    const espacioAbajo = window.innerHeight - rect.bottom
    const abrirArriba = espacioAbajo < altoMenuEstimado && rect.top > altoMenuEstimado

    const anchoMenu = 184
    let right = window.innerWidth - rect.right
    if (right < 8) right = 8
    if (window.innerWidth - right < anchoMenu) {
      right = Math.max(8, window.innerWidth - anchoMenu - 8)
    }

    setPosicion({
      top: abrirArriba ? rect.top - 6 : rect.bottom + 6,
      right,
      abrirArriba,
    })
  }

  const toggle = (e) => {
    e.stopPropagation()
    if (disabled) return
    if (!abierto) {
      actualizarPosicion()
      setAbierto(true)
    } else {
      setAbierto(false)
    }
  }

  useEffect(() => {
    if (!abierto) return

    const handleClickAfuera = (e) => {
      if (
        botonRef.current &&
        !botonRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setAbierto(false)
      }
    }

    const handleKey = (e) => {
      if (e.key === 'Escape') setAbierto(false)
    }

    const handleScroll = () => {
      setAbierto(false)
    }

    document.addEventListener('pointerdown', handleClickAfuera)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)

    return () => {
      document.removeEventListener('pointerdown', handleClickAfuera)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    }
  }, [abierto])

  return (
    <div className="relative inline-flex items-center justify-center">
      <button
        ref={botonRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        className="h-8 w-8 rounded-lg border border-border bg-surface hover:bg-page hover:border-orange-500/50 text-text-muted hover:text-text transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        title="Acciones"
        aria-label="Acciones"
        aria-expanded={abierto}
      >
        <IconDotsVertical className="w-4 h-4" />
      </button>

      {abierto &&
        createPortal(
          <div
            ref={menuRef}
            data-ui="filament-actions-menu"
            style={{
              position: 'fixed',
              top: posicion.abrirArriba ? 'auto' : `${posicion.top}px`,
              bottom: posicion.abrirArriba
                ? `${window.innerHeight - posicion.top}px`
                : 'auto',
              right: `${posicion.right}px`,
            }}
            className="z-[9999] w-44 rounded-xl border border-border bg-surface p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="flex flex-col gap-0.5">
              {acciones.map((acc, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={acc.disabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    setAbierto(false)
                    acc.onClick?.()
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer select-none ${
                    acc.danger
                      ? 'text-danger hover:bg-danger/10 hover:text-danger'
                      : acc.warning
                      ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-500/10'
                      : acc.success
                      ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                      : 'text-text hover:bg-page'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {acc.icon && (
                    <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                      {acc.icon}
                    </span>
                  )}
                  <span className="truncate">{acc.label}</span>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
