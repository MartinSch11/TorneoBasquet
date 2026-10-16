import { useEffect, useRef, useState } from 'react'

function ImagenLazy({ src, alt, className }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!window.IntersectionObserver || !ref.current) {
      setVisible(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true)
            obs.disconnect()
          }
        })
      },
      { rootMargin: '200px' },
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className={className}>
      {visible && (
        <img
          src={src}
          alt={alt}
          width="400"
          height="400"
          loading="lazy"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  )
}

export default function GaleriaGrid({ fotos, onAbrir }) {
  return (
    <div id="galeria-grid" className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {fotos.map((foto, index) => (
        <button
          key={foto.id}
          type="button"
          onClick={() => onAbrir?.(foto, index)}
          className="aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl border border-border bg-surface text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 hover:border-orange-500/50 transition-colors group"
          aria-label={`Ver foto en alta resolución: ${foto.titulo || 'Foto de la galería'}`}
        >
          <ImagenLazy
            src={foto.url}
            alt={foto.titulo || 'Foto de la galería'}
            className="h-full w-full group-hover:scale-105 transition-transform duration-200"
          />
        </button>
      ))}
    </div>
  )
}