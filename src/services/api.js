import axios from 'axios'

const TOKEN_KEY = 'estoquepro:token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Anexa o token em toda requisição, se existir
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Telas públicas: não redirecionam para o login em caso de 401
const ROTAS_PUBLICAS = ['/login', '/recuperar-senha', '/redefinir-senha']

// Se o backend responder 401, o token é inválido/expirado — limpa e redireciona pro login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      if (!ROTAS_PUBLICAS.includes(window.location.pathname)) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api
