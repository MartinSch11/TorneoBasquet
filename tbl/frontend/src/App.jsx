import { Routes, Route, Outlet, Link } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Inicio from './pages/Inicio'
import Posiciones from './pages/Posiciones'
import Resultados from './pages/Resultados'
import DetallePartido from './pages/DetallePartido'
import Equipos from './pages/Equipos'
import FichaEquipo from './pages/FichaEquipo'
import ProximosPartidos from './pages/ProximosPartidos'
import Goleadores from './pages/Goleadores'
import EstadisticasEquipos from './pages/EstadisticasEquipos'
import EstadisticasJugadores from './pages/EstadisticasJugadores'
import Galeria from './pages/Galeria'
import Admin from './pages/Admin'
import RequireAdmin from './components/route/RequireAdmin'

function Layout() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-page text-text transition-colors duration-300">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Inicio />} />
        <Route path="/posiciones" element={<Posiciones />} />
        <Route path="/resultados" element={<Resultados />} />
        <Route path="/partidos/:id" element={<DetallePartido />} />
        <Route path="/equipos" element={<Equipos />} />
        <Route path="/equipos/:id" element={<FichaEquipo />} />
        <Route path="/proximos" element={<ProximosPartidos />} />
        <Route path="/goleadores" element={<Goleadores />} />
        <Route path="/estadisticas/equipos" element={<EstadisticasEquipos />} />
        <Route path="/estadisticas/jugadores" element={<EstadisticasJugadores />} />
        <Route path="/galeria" element={<Galeria />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Admin />
            </RequireAdmin>
          }
        />
        <Route
          path="*"
          element={
            <div className="grid min-h-[60vh] place-items-center">
              <div className="text-center">
                <p className="font-display text-4xl font-bold text-accent">404</p>
                <p className="mt-2 text-text-muted">Página no encontrada</p>
                <Link to="/" className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-white hover:bg-accent-muted">
                  Volver al inicio
                </Link>
              </div>
            </div>
          }
        />
      </Route>
    </Routes>
  )
}