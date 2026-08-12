import api from './api'

const TOKEN_KEY = 'estoquepro:token'

export async function registrar({ nome, email, senha }) {
  const { data } = await api.post('/register', {
    name: nome,
    email,
    password: senha,
    password_confirmation: senha,
  })
  localStorage.setItem(TOKEN_KEY, data.token)
  return data
}

export async function login({ email, senha }) {
  const { data } = await api.post('/login', {
    email,
    password: senha,
  })
  localStorage.setItem(TOKEN_KEY, data.token)
  return data
}

export async function logout() {
  await api.post('/logout')
  localStorage.removeItem(TOKEN_KEY)
}

export async function usuarioLogado() {
  const { data } = await api.get('/user')
  return data
}