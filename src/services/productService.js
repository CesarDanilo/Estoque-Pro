import api from './api'

export const productService = {
  // GET /api/products?search=...&group_id=...&active=...
  async getAll(params = {}) {
    const response = await api.get('/products', { params })
    return response.data?.data || response.data
  },

  // GET /api/products/:id
  async getById(id) {
    if (!id) throw new Error('ID do produto não informado.')
    const response = await api.get(`/products/${String(id)}`)
    return response.data?.data || response.data
  },

  // POST /api/products
  async create(payload) {
    const response = await api.post('/products', payload)
    return response.data?.data || response.data
  },

  // PUT /api/products/:id
  async update(id, payload) {
    if (!id) throw new Error('ID do produto não informado.')
    const response = await api.put(`/products/${String(id)}`, payload)
    return response.data?.data || response.data
  },

  // DELETE /api/products/:id
  async delete(id) {
    if (!id) throw new Error('ID do produto não informado.')
    const response = await api.delete(`/products/${String(id)}`)
    return response.data
  },
}
