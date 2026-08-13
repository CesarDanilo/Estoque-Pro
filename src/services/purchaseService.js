import api from './api'

export const purchaseService = {
  async getPurchases(params) {
    const response = await api.get('/purchases', { params })
    return response.data
  },

  // GET /api/purchases/{id} — usado para carregar os itens completos
  // de uma compra (útil se você quiser telas de detalhe/edição depois).
  async getPurchase(id) {
    const response = await api.get(`/purchases/${id}`)
    return response.data
  },

  async createPurchase(data) {
    const response = await api.post('/purchases', data)
    return response.data
  },

  async updatePurchase(id, data) {
    const response = await api.put(`/purchases/${id}`, data)
    return response.data
  },

  async deletePurchase(id) {
    const response = await api.delete(`/purchases/${id}`)
    return response.data
  },
}
