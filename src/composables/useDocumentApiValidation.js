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
    const payloadKey = tipo === 'CPF' ? 'cpf' : 'cnpj'
    const payload = { [payloadKey]: digitos }

    // 🟢 DEBUG: mostra exatamente o que está sendo enviado
    console.log(`[useDocumentApiValidation] → POST ${rota}`, payload)

    try {
      const response = await api.post(rota, payload)

      if (idAtual !== requestId) return

      // 🟢 DEBUG: mostra a resposta CRUA completa, exatamente como o axios recebeu
      console.log(`[useDocumentApiValidation] ← resposta crua (${tipo}):`, response.data)

      const resultado = response.data?.data ?? response.data ?? {}

      // 🟢 DEBUG: mostra o objeto já "desembrulhado" que o composable vai usar
      console.log(`[useDocumentApiValidation] ← resultado extraído (${tipo}):`, resultado)

      if (!resultado.exists) {
        state.status = 'not_found'
        console.log(`[useDocumentApiValidation] status => not_found`)
        return
      }

      state.status = 'found'
      state.nome = resultado.name || null
      state.nascimento = resultado.birth_date || null
      state.genero = resultado.gender || null
      state.fantasia = resultado.trade_name || null
      state.cidade = resultado.city || null
      state.uf = resultado.state || null
      state.cep = resultado.zip_code || null
      state.endereco = resultado.address || null

      // 🟢 DEBUG: mostra o state final depois de preenchido
      console.log(`[useDocumentApiValidation] status => found`, { ...state })
    } catch (e) {
      if (idAtual !== requestId) return

      // 🟢 DEBUG: mostra o erro completo (status HTTP + corpo da resposta de erro)
      console.log(`[useDocumentApiValidation] ✖ erro na consulta (${tipo}):`, {
        status: e.response?.status,
        data: e.response?.data,
        erro: e,
      })

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
