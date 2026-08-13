import api from './api'

export const documentService = {
  async validarCpf(cpf) {
    const { data } = await api.post('/document/cpf/validate', { cpf })
    return data.data
  },

  async validarCnpj(cnpj) {
    const { data } = await api.post('/document/cnpj/validate', { cnpj })
    return data.data
  },

  async validarEmail(email) {
    const { data } = await api.post('/email/validate', { email })
    return data.data
  },
}
