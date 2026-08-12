import api from '@/services/api' // ou sua instância do axios configurada

export const saleService = {
  async getSales(params) {
    const response = await api.get('/sales', { params })
    return response.data
  },

  // GET /api/sales/{id} — usado para carregar cliente, pagamento E os itens
  // completos de uma venda antes de abrir o modal de edição.
  async getSale(id) {
    const response = await api.get(`/sales/${id}`)
    return response.data
  },

  async createSale(data) {
    const response = await api.post('/sales', data)
    return response.data
  },

  async updateSale(id, data) {
    const response = await api.put(`/sales/${id}`, data)
    return response.data
  },

  async deleteSale(id) {
    const response = await api.delete(`/sales/${id}`)
    return response.data
  },
}
