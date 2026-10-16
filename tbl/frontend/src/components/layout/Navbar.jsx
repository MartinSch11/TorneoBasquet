import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import LoginModal from '../ui/LoginModal'
import {
  IconSun,
  IconMoon,
  IconUser,
  IconGear,
  IconLogOut,
  IconMenu,
  IconClose,
  IconChevronDown,
} from '../ui/Icon'

const links = [
  { to: '/', label: 'Inicio' },
  {
    to: '/posiciones',
    label: 'Torneo',
    hijos: [
      { to: '/posiciones', label: 'Posiciones' },
      { to: '/resultados', label: 'Resultados' },
      { to: '/equipos', label: 'Equipos' },
      { to: '/proximos', label: 'Próximos Partidos' },
      { to: '/goleadores', label: 'Goleadores' },
    ],
  },
  {
    to: '/estadisticas/equipos',
    label: 'Estadísticas',
    hijos: [
      { to: '/estadisticas/equipos', label: 'Por Equipo' },
      { to: '/estadisticas/jugadores', label: 'Por Jugador' },
    ],
  },
  { to: '/galeria', label: 'Galería' },
]

function ItemLogo() {
  return (
    <NavLink
      to="/"
      className="flex items-center gap-3 active:scale-95 transition-transform group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg"
      aria-label="LBA - Inicio"
    >
      <span className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-text group-hover:text-orange-500 transition-colors">
        LBA
      </span>
      <span className="hidden sm:flex flex-col text-[10px] font-bold tracking-widest uppercase text-text-muted leading-tight font-display">
        <span>Básquetbol</span>
        <span className="text-orange-600 dark:text-orange-400 font-bold">Amateur</span>
      </span>
    </NavLink>
  )
}

function BotonTema() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-page text-text hover:border-orange-500 active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {theme === 'dark' ? <IconSun className="w-5 h-5 text-amber-400" /> : <IconMoon className="w-5 h-5 text-slate-700 dark:text-slate-300" />}
    </button>
  )
}

function AccederBoton({ onAbrirLogin, onAccionMenu, esMobile }) {
  const { user, logout } = useAuth()
  const [menu, setMenu] = useState(false)
  const userMenuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!menu) return

    const handleClickFuera = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setMenu(false)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setMenu(false)
    }

    document.addEventListener('pointerdown', handleClickFuera)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handleClickFuera)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [menu])

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => {
          onAbrirLogin?.()
          onAccionMenu?.()
        }}
        className={`flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 font-semibold text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 active:scale-95 ${
          esMobile ? 'w-full py-3 text-base' : 'px-5 py-2 text-sm'
        }`}
      >
        <span>Acceder</span>
      </button>
    )
  }

  return (
    <div ref={userMenuRef} className={esMobile ? 'w-full' : 'relative'}>
      <button
        type="button"
        onClick={() => setMenu((m) => !m)}
        className={`flex items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 font-semibold text-orange-600 dark:text-orange-400 transition-colors duration-150 hover:bg-orange-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 active:scale-95 ${
          esMobile ? 'w-full py-3 text-base' : 'px-4 py-2 text-sm'
        }`}
        aria-expanded={menu}
      >
        <IconUser className="w-4 h-4" />
        <span>{user.usuario}</span>
      </button>
      {menu && (
        <div
          data-ui="dropdown-overlay"
          className={`z-20 rounded-xl border border-border bg-surface p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${
            esMobile ? 'mt-2 w-full' : 'absolute right-0 top-full mt-1.5 w-48'
          }`}
        >
          {user.rol === 'admin' && (
            <button
              onClick={() => {
                setMenu(false)
                navigate('/admin')
                onAccionMenu?.()
              }}
              className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-text hover:bg-page transition-colors"
            >
              <IconGear className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span>Panel Admin</span>
            </button>
          )}
          <button
            onClick={() => {
              logout()
              setMenu(false)
              onAccionMenu?.()
            }}
            className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <IconLogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const [drawer, setDrawer] = useState(false)
  const [loginModalAbierto, setLoginModalAbierto] = useState(false)
  const [subAbierto, setSubAbierto] = useState('')
  const [linkActivo, setLinkActivo] = useState('')
  const navRef = useRef(null)
  const location = useLocation()

  const toggleLink = (label) => setLinkActivo((s) => (s === label ? '' : label))

  // Cerrar menús al cambiar de ruta
  useEffect(() => {
    setLinkActivo('')
    setDrawer(false)
  }, [location.pathname])

  // Cerrar menú desktop al hacer click afuera o presionar Escape
  useEffect(() => {
    if (!linkActivo) return

    const handleClickFuera = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setLinkActivo('')
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setLinkActivo('')
    }

    document.addEventListener('pointerdown', handleClickFuera)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handleClickFuera)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [linkActivo])

  useEffect(() => {
    if (drawer) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawer])

  const renderItems = (esMobile) => (
    <nav
      ref={esMobile ? undefined : navRef}
      className={esMobile ? 'flex flex-col gap-1' : 'flex items-center gap-1'}
    >
      {links.map((link) => {
        if (!link.hijos) {
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => {
                setLinkActivo('')
                setDrawer(false)
              }}
              className={({ isActive }) =>
                `rounded-xl px-4 transition-colors duration-150 ${
                  isActive
                    ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold'
                    : 'text-text-muted hover:bg-page hover:text-text'
                } ${
                  esMobile
                    ? 'flex items-center py-3 text-base'
                    : 'h-9 inline-flex items-center justify-center font-medium text-sm'
                }`
              }
            >
              <span>{link.label}</span>
            </NavLink>
          )
        }

        if (esMobile) {
          const isSubOpen = subAbierto === link.label
          return (
            <div key={link.label} className="rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setSubAbierto((s) => (s === link.label ? '' : link.label))}
                className={`flex w-full items-center justify-between px-4 py-3 text-base font-semibold transition-colors ${
                  isSubOpen ? 'bg-page text-text' : 'text-text-muted hover:bg-page hover:text-text'
                }`}
                aria-expanded={isSubOpen}
              >
                <span>{link.label}</span>
                <IconChevronDown className={`w-4 h-4 transition-transform duration-200 ${isSubOpen ? 'rotate-180 text-orange-500' : ''}`} />
              </button>
              {isSubOpen && (
                <div className="flex flex-col gap-1 bg-page/50 p-2 my-1 rounded-xl">
                  {link.hijos.map((hijo) => (
                    <NavLink
                      key={hijo.to}
                      to={hijo.to}
                      onClick={() => setDrawer(false)}
                      className={({ isActive }) =>
                        `rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold'
                            : 'text-text-muted hover:text-text hover:bg-page'
                        }`
                      }
                    >
                      {hijo.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        }

        const isHijoActivo = link.hijos?.some((h) => location.pathname === h.to)

        return (
          <div key={link.label} className="relative">
            <button
              type="button"
              onClick={() => toggleLink(link.label)}
              className={`h-9 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 text-sm transition-colors ${
                linkActivo === link.label
                  ? 'bg-page text-orange-600 dark:text-orange-400 font-semibold'
                  : isHijoActivo
                  ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold'
                  : 'text-text-muted hover:bg-page hover:text-text font-medium'
              }`}
              aria-expanded={linkActivo === link.label}
            >
              <span>{link.label}</span>
              <IconChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${linkActivo === link.label ? 'rotate-180 text-orange-500' : ''}`} />
            </button>
            {linkActivo === link.label && (
              <div data-ui="dropdown-overlay" className="absolute left-0 top-full z-20 mt-1.5 w-52 rounded-xl border border-border bg-surface p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                {link.hijos.map((hijo) => (
                  <NavLink
                    key={hijo.to}
                    to={hijo.to}
                    onClick={() => setLinkActivo('')}
                    className={({ isActive }) =>
                      `block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold' : 'text-text-muted hover:bg-page hover:text-text'
                      }`
                    }
                  >
                    {hijo.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )

  return (
    <header data-ui="sticky-nav" className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md transition-colors duration-300">{/* taste-skill-ignore */}
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-page text-text transition-colors hover:border-orange-500 hover:text-orange-500 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 md:hidden"
            aria-label="Abrir menú"
          >
            <IconMenu className="w-5 h-5" />
          </button>
          <ItemLogo />
        </div>
        <div className="hidden md:block">{renderItems(false)}</div>
        <div className="flex items-center gap-2">
          <BotonTema />
          <div className="hidden md:block">
            <AccederBoton
              onAbrirLogin={() => setLoginModalAbierto(true)}
              esMobile={false}
            />
          </div>
        </div>
      </div>

      {/* Drawer de Menú Móvil con Portal para Superponerse a TODO */}
      {drawer &&
        createPortal(
          <div className="fixed inset-0 z-[99999] md:hidden flex">
            {/* Backdrop oscuro */}
            <div
              className="fixed inset-0 bg-black/75 transition-opacity"
              onClick={() => setDrawer(false)}
            />
            {/* Panel de Drawer */}
            <div data-ui="mobile-drawer" className="relative z-[100000] h-full w-[85%] max-w-[320px] overflow-y-auto border-r border-border bg-surface text-text p-5 shadow-2xl flex flex-col justify-between">
              <div>
                <div data-ui="drawer-header" className="mb-5 flex items-center justify-between border-b border-border pb-4">
                  <span className="font-display text-2xl font-bold uppercase text-text tracking-wide">Menú LBA</span>
                  <div className="flex items-center gap-2">
                    <BotonTema />
                    <button
                      type="button"
                      onClick={() => setDrawer(false)}
                      className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-page text-text-muted hover:text-orange-500 active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                      aria-label="Cerrar menú"
                    >
                      <IconClose className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                {renderItems(true)}
              </div>
              <div data-ui="drawer-footer" className="mt-6 border-t border-border pt-5">
                <AccederBoton
                  onAbrirLogin={() => setLoginModalAbierto(true)}
                  onAccionMenu={() => setDrawer(false)}
                  esMobile={true}
                />
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal de Inicio de Sesión fuera del drawer */}
      {loginModalAbierto && (
        <LoginModal onClose={() => setLoginModalAbierto(false)} />
      )}
    </header>
  )
}