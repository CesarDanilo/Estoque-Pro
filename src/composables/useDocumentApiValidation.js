import { reactive, watch } from 'vue'
import api from '@/services/api'

const CPF_LEN = 11
const CNPJ_LEN = 14
const DEBOUNCE_MS = 500

export function useDocumentApiValidation(getDigits) {
  const state = reactive({
    status: 'idle', // idle | checking | found | not_found | error
    tipo: null, // 'CPF' | 'CNPJ'
    nome: null,
    nascimento: null,
    genero: null,
    fantasia: null,
    cidade: null,
    uf: null,
    cep: null,
    endereco: null,
  })

  let timeout = null
  let requestId = 0

  function resetDados() {
    state.nome = null
    state.nascimento = null
    state.genero = null
    state.fantasia = null
    state.cidade = null
    state.uf = null
    state.cep = null
    state.endereco = null
  }

  async function consultar(digitos) {
    const idAtual = ++requestId
    const tipo = digitos.length > CPF_LEN ? 'CNPJ' : 'CPF'
    state.tipo = tipo
    state.status = 'checking'
    resetDados()

    const rota = tipo === 'CPF' ? '/document/cpf/validate' : '/document/cnpj/validate'

    try {
      const { data } = await api.post(rota, { document: digitos })

      if (idAtual !== requestId) return

      if (!data.valid) {
        state.status = 'error'
        return
      }

      if (!data.found) {
        state.status = 'not_found'
        return
      }

      state.status = 'found'
      state.nome = data.name || null
      state.nascimento = data.birth_date || null
      state.genero = data.gender || null
      state.fantasia = data.trade_name || null
      state.cidade = data.city || null
      state.uf = data.state || null
      state.cep = data.zip_code || null
      state.endereco = data.address || null
    } catch (e) {
      if (idAtual !== requestId) return
      state.status = 'error'
    }
  }

  watch(
    getDigits,
    (digitos) => {
      clearTimeout(timeout)
      const limpo = (digitos || '').replace(/\D/g, '')

      if (limpo.length !== CPF_LEN && limpo.length !== CNPJ_LEN) {
        requestId++
        state.status = 'idle'
        state.tipo = limpo.length > CPF_LEN ? 'CNPJ' : 'CPF'
        resetDados()
        return
      }

      timeout = setTimeout(() => consultar(limpo), DEBOUNCE_MS)
    },
    { immediate: false },
  )

  return state
}
