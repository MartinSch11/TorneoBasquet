import axios from 'axios'

const TOKEN_KEY = 'tbl_token'
const USER_KEY = 'tbl_user'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
})

const getToken = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      sessionStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem(USER_KEY)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired'))
      }
    }
    // Si la respuesta es texto plano (ej. proxy/gateway 502/504), normalizar a objeto con detail
    if (error.response && typeof error.response.data === 'string') {
      error.response.data = { detail: error.response.data }
    }
    return Promise.reject(error)
  },
)

export function getErrorMessage(error, fallback = 'Ocurrió un error inesperado.') {
  if (!error) return fallback
  if (!error.response) {
    return error.request
      ? 'No se pudo conectar con el servidor. Verifique su conexión.'
      : error.message || fallback
  }
  const detail = error.response.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg || JSON.stringify(d)).join(', ')
  }
  if (detail && typeof detail === 'object') {
    return detail.message || JSON.stringify(detail)
  }
  return fallback
}

export default api
export { TOKEN_KEY, USER_KEY }