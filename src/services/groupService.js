import api from './api'

export const groupService = {
  async listar(params = {}) {
    const { data } = await api.get('/groups', { params })
    return data
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
