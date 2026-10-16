import { useCallback, useEffect, useState } from 'react'

export function useApi(fn, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const ejecutar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resultado = await fn()
      setData(resultado)
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    ejecutar()
  }, [ejecutar])

  return { data, error, loading, ejecutar }
}