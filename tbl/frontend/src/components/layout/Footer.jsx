import { Link } from 'react-router-dom'

// Configuración de la empresa desarrolladora
export const EMPRESA_DESARROLLADORA = {
  nombre: 'Ibirá System',
  url: '#',
  subtitulo: 'Desarrollo de Software & Plataformas Digitales',
}

function IconInstagram({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function IconFacebook({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function IconYouTube({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </svg>
  )
}

function IconWhatsApp({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer data-ui="footer" className="relative border-t border-border bg-surface text-text overflow-hidden transition-colors duration-300">
      {/* Contenido Principal */}
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12">
          {/* Columna Marca e Institucional */}
          <div className="flex flex-col gap-4 lg:col-span-5">
            <Link
              to="/"
              className="inline-flex items-center gap-3 active:scale-95 transition-transform group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg"
              aria-label="LBA - Inicio"
            >
              <span className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-text group-hover:text-orange-500 transition-colors">
                LBA
              </span>
              <span className="flex flex-col text-[10px] font-bold tracking-widest uppercase text-text-muted leading-tight font-display">
                <span>Básquetbol</span>
                <span className="text-orange-600 dark:text-orange-400 font-bold">Amateur</span>
              </span>
            </Link>

            <p className="text-xs text-text-muted leading-relaxed max-w-sm">
              Plataforma oficial de la Liga de Básquetbol Amateur. Estadísticas en vivo, resultados fecha a fecha, posiciones actualizadas y listas completas de cada equipo participante.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-base text-xs font-medium text-text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Temporada {currentYear} · Torneo Oficial
              </span>
            </div>
          </div>

          {/* Columna Enlaces de Competencia */}
          <div className="flex flex-col gap-3 lg:col-span-2">
            <h4 className="font-display text-sm font-bold uppercase text-text">
              Torneo
            </h4>
            <ul className="flex flex-col gap-2 text-xs text-text-muted">
              <li>
                <Link to="/posiciones" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                  Posiciones
                </Link>
              </li>
              <li>
                <Link to="/resultados" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                  Resultados
                </Link>
              </li>
              <li>
                <Link to="/proximos" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                  Próximos Partidos
                </Link>
              </li>
              <li>
                <Link to="/equipos" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                  Equipos
                </Link>
              </li>
              <li>
                <Link to="/goleadores" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                  Goleadores
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna Estadísticas y Multimedia */}
          <div className="flex flex-col gap-3 lg:col-span-2">
            <h4 className="font-display text-sm font-bold uppercase text-text">
              Estadísticas
            </h4>
            <ul className="flex flex-col gap-2 text-xs text-text-muted">
              <li>
                <Link to="/estadisticas/equipos" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                  Estadísticas por Equipo
                </Link>
              </li>
              <li>
                <Link to="/estadisticas/jugadores" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                  Estadísticas por Jugador
                </Link>
              </li>
              <li>
                <Link to="/galeria" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                  Galería de Fotos
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                  Panel de Administración
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna Canales Oficiales y Redes */}
          <div className="flex flex-col gap-3 lg:col-span-3">
            <h4 className="font-display text-sm font-bold uppercase text-text">
              Comunidad LBA
            </h4>
            <p className="text-xs text-text-muted text-pretty">
              Seguí las transmisiones, coberturas fotográficas y novedades del torneo en nuestras redes oficiales.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 rounded-lg border border-border bg-base hover:border-orange-500 hover:text-orange-500 text-text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 inline-flex items-center justify-center shrink-0"
                aria-label="Instagram de LBA"
              >
                <IconInstagram />
              </a>
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 rounded-lg border border-border bg-base hover:border-orange-500 hover:text-orange-500 text-text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 inline-flex items-center justify-center shrink-0"
                aria-label="Facebook de LBA"
              >
                <IconFacebook />
              </a>
              <a
                href="https://www.youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 rounded-lg border border-border bg-base hover:border-orange-500 hover:text-orange-500 text-text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 inline-flex items-center justify-center shrink-0"
                aria-label="YouTube de LBA"
              >
                <IconYouTube />
              </a>
              <a
                href="https://whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 rounded-lg border border-border bg-base hover:border-orange-500 hover:text-orange-500 text-text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 inline-flex items-center justify-center shrink-0"
                aria-label="Contacto por WhatsApp"
              >
                <IconWhatsApp />
              </a>
            </div>
          </div>
        </div>

        {/* Separador inferior */}
        <div className="mt-12 border-t border-border/60 pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-text-muted" data-ui="footer-bottom">
          {/* Copyright LBA */}
          <div>
            <p className="font-sans">
              © {currentYear} <span className="font-bold text-text">LBA</span> - Liga de Básquetbol Amateur. Todos los derechos reservados.
            </p>
          </div>

          {/* Marca de Agua / Créditos Corporativos de la Empresa Desarrolladora */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted">Diseñado y desarrollado por</span>
            <a
              href={EMPRESA_DESARROLLADORA.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/80 bg-base/80 hover:bg-surface hover:border-orange-500/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 group"
              title={EMPRESA_DESARROLLADORA.subtitulo}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 group-hover:scale-125 transition-transform" />
              <span className="font-display font-bold uppercase text-[11px] text-text group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                {EMPRESA_DESARROLLADORA.nombre}
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}