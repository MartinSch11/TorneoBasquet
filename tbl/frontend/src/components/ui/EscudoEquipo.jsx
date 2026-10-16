import { useState } from 'react'

/**
 * EscudoEquipo - Identidad visual de clubes de básquetbol.
 * Muestra el escudo oficial si existe o genera un badge deportivo de alta calidad
 * con colores temáticos por equipo, textura de básquet y monograma en Oswald.
 */

const PALETAS_GENERICAS = [
  { primary: '#2563eb', secondary: '#1d4ed8', border: '#60a5fa', text: '#ffffff' },
  { primary: '#ea580c', secondary: '#9a3412', border: '#fb923c', text: '#ffffff' },
  { primary: '#059669', secondary: '#065f46', border: '#34d399', text: '#ffffff' },
  { primary: '#0f172a', secondary: '#1e293b', border: '#475569', text: '#ffffff' },
  { primary: '#dc2626', secondary: '#991b1b', border: '#f87171', text: '#ffffff' },
  { primary: '#d97706', secondary: '#b45309', border: '#fcd34d', text: '#ffffff' },
]

const TEMAS_CONOCIDOS = {
  leones: { primary: '#d97706', secondary: '#92400e', border: '#fbbf24', text: '#ffffff' },
  cóndores: { primary: '#1d4ed8', secondary: '#1e40af', border: '#60a5fa', text: '#ffffff' },
  condores: { primary: '#1d4ed8', secondary: '#1e40af', border: '#60a5fa', text: '#ffffff' },
  tigres: { primary: '#ea580c', secondary: '#9a3412', border: '#fb923c', text: '#ffffff' },
  lobos: { primary: '#059669', secondary: '#065f46', border: '#34d399', text: '#ffffff' },
  panteras: { primary: '#09090b', secondary: '#27272a', border: '#71717a', text: '#ffffff' },
  águilas: { primary: '#dc2626', secondary: '#991b1b', border: '#f87171', text: '#ffffff' },
  aguilas: { primary: '#dc2626', secondary: '#991b1b', border: '#f87171', text: '#ffffff' },
}

export default function EscudoEquipo({
  url,
  nombre = 'Equipo',
  className = 'w-10 h-10',
}) {
  const [errorCarga, setErrorCarga] = useState(false)

  // Extraer iniciales de dos caracteres
  const palabras = nombre.trim().split(/\s+/)
  let iniciales = ''
  if (palabras.length === 1) {
    iniciales = palabras[0].slice(0, 2).toUpperCase()
  } else {
    iniciales = (palabras[0][0] + palabras[1][0]).toUpperCase()
  }

  // Determinar paleta según nombre del equipo
  const nombreKey = nombre.trim().toLowerCase()
  const tema =
    TEMAS_CONOCIDOS[nombreKey] ||
    PALETAS_GENERICAS[
      Math.abs(
        nombre.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0),
      ) % PALETAS_GENERICAS.length
    ]

  const esAvatarGenerico = !url || url.includes('ui-avatars.com')

  if (!esAvatarGenerico && !errorCarga) {
    return (
      <div className={`relative shrink-0 flex items-center justify-center ${className}`}>
        <img
          src={url}
          alt={`Escudo de ${nombre}`}
          loading="lazy"
          onError={() => setErrorCarga(true)}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    )
  }

  const idGrad = `escudo-${nombre.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center select-none ${className}`}
      title={nombre}
    >
      <svg
        viewBox="0 0 48 54"
        className="w-full h-full transition-transform group-hover:scale-105"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`${idGrad}-base`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={tema.primary} />
            <stop offset="100%" stopColor={tema.secondary} />
          </linearGradient>
        </defs>

        {/* Silueta atlética de club (forma de blasón deportivo moderno con tope recto) */}
        <path
          d="M 6 4 L 42 4 C 42 28, 38 44, 24 51 C 10 44, 6 28, 6 4 Z"
          fill={`url(#${idGrad}-base)`}
          stroke={tema.border}
          strokeWidth="1.75"
        />

        {/* Costura / líneas sutiles de pelota de básquetbol */}
        <path
          d="M 24 4 L 24 51"
          stroke="#ffffff"
          strokeWidth="1"
          strokeOpacity="0.25"
        />
        <path
          d="M 6 26 Q 24 38, 42 26"
          stroke="#ffffff"
          strokeWidth="1"
          strokeOpacity="0.25"
          fill="none"
        />
        <path
          d="M 8 12 Q 24 22, 40 12"
          stroke="#ffffff"
          strokeWidth="0.8"
          strokeOpacity="0.2"
          fill="none"
        />

        {/* Borde interior dorado / plateado de realce */}
        <path
          d="M 9 7 L 39 7 C 39 26, 35 41, 24 47 C 13 41, 9 26, 9 7 Z"
          stroke="#ffffff"
          strokeWidth="0.75"
          strokeOpacity="0.35"
          fill="none"
        />

        {/* Monograma en Oswald Bold */}
        <text
          x="24"
          y="31"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Oswald, sans-serif"
          fontSize="17"
          fontWeight="700"
          letterSpacing="0.5"
          fill={tema.text}
        >
          {iniciales}
        </text>
      </svg>
    </div>
  )
}
