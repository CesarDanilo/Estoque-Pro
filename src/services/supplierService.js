import api from './api'

export const supplierService = {
  // GET /api/suppliers?search=...
  async getAll(search = '') {
    const response = await api.get('/suppliers', {
      params: { search },
    })
    // Trata caso a API retorne { data: [...] } ou diretamente [...]
    return response.data?.data || response.data
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
    // Garante que o id não vá como undefined ou objeto
    if (!id) throw new Error('ID do fornecedor não informado.')

    const response = await api.delete(`/suppliers/${String(id)}`)
    return response.data
  },
}
