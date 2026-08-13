import api from './api'

export const supplierService = {
  // GET /api/suppliers?search=...&page=...&per_page=...
  // Aceita string (compatibilidade com chamadas antigas) ou objeto de params
  async getAll(params = {}) {
    const query = typeof params === 'string' ? { search: params } : params || {}
    const response = await api.get('/suppliers', { params: query })
    return response.data
  },

  // POST /api/suppliers
  async create(payload) {
    const response = await api.post('/suppliers', payload)
    return response.data?.data || response.data
  },

  // PUT /api/suppliers/:id
  async update(id, payload) {
    const response = await api.put(`/suppliers/${String(id)}`, payload)
    return response.data?.data || response.data
  },

  // DELETE /api/suppliers/:id
  async delete(id) {
    if (!id) throw new Error('ID do fornecedor não informado.')

    const response = await api.delete(`/suppliers/${String(id)}`)
    return response.data
  },
}
