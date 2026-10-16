import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const TorneoContext = createContext(null)

export function TorneoProvider({ children }) {
  const [torneos, setTorneos] = useState([])
  const [torneoSeleccionado, setTorneoSeleccionado] = useState(() => {
    const raw = sessionStorage.getItem('tbl_torneo')
    return raw ? JSON.parse(raw) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let activo = true
    api
      .get('/torneos')
      .then((res) => {
        if (!activo) return
        setTorneos(res.data)
        setLoading(false)
        setTorneoSeleccionado((prev) => {
          if (prev) return prev
          const activo = res.data.find((t) => t.estado === 'activo') || res.data[0]
          return activo || null
        })
      })
      .catch(() => {
        if (activo) setLoading(false)
      })
    return () => {
      activo = false
    }
  }, [])

  const seleccionar = (torneo) => {
    setTorneoSeleccionado(torneo)
    if (torneo) {
      sessionStorage.setItem('tbl_torneo', JSON.stringify(torneo))
    } else {
      sessionStorage.removeItem('tbl_torneo')
    }
  }

  return (
    <TorneoContext.Provider
      value={{ torneos, torneoSeleccionado, seleccionar, loading }}
    >
      {children}
    </TorneoContext.Provider>
  )
}

export function useTorneo() {
  const ctx = useContext(TorneoContext)
  if (!ctx) throw new Error('useTorneo debe usarse dentro de TorneoProvider')
  return ctx
}