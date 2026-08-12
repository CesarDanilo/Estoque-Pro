import api from '@/services/api' // ou sua instância do axios configurada

export const saleService = {
  async getSales(params) {
    const response = await api.get('/sales', { params })
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
