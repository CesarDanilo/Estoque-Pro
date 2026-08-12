import axios from './api'

export const saleService = {
  /**
   * Busca as vendas paginadas com filtros
   */
  async getSales(params = {}) {
    const { data } = await axios.get('/sales', { params })
    return data
  },

  /**
   * Registra uma nova venda
   */
  async createSale(saleData) {
    const { data } = await axios.post('/sales', saleData)
    return data
  },

  /**
   * Detalhes de uma venda por ID
   */
  async getSaleById(id) {
    const { data } = await axios.get(`/sales/${id}`)
    return data
  },
}
