import api from './api'

export const groupService = {
  async listar(params = {}) {
    const { data } = await api.get('/groups', { params })
    return data
  },

  // Percorre todas as páginas de /groups (a API pagina de 15 em 15)
  async listarTodos() {
    const primeira = await groupService.listar({ page: 1 })
    const ultimaPagina = primeira?.last_page || 1

    const demais = await Promise.all(
      Array.from({ length: ultimaPagina - 1 }, (_, i) => groupService.listar({ page: i + 2 })),
    )

    return [primeira, ...demais].flatMap((pagina) => pagina?.data || [])
  },

  async buscarPorId(id) {
    const { data } = await api.get(`/groups/${id}`)
    return data
  },

  async criar(payload) {
    const { data } = await api.post('/groups', payload)
    return data
  },

  async atualizar(id, payload) {
    const { data } = await api.put(`/groups/${id}`, payload)
    return data
  },

  async deletar(id) {
    const { data } = await api.delete(`/groups/${id}`)
    return data
  },
}
