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
          <img
            src={foto.url}
            alt={foto.titulo || 'Foto de la galería'}
            width="400"
            height="400"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        </button>
      ))}
    </div>
  )
}