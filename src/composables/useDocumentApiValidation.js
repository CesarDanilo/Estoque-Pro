import { reactive, watch } from 'vue'
import { documentService } from '@/services/documentService'

// Consulta a Receita (via nossa API) assim que o documento fecha 11 (CPF)
// ou 14 (CNPJ) dígitos. `source` pode ser um ref ou uma função getter,
// ex: useDocumentApiValidation(() => documento.raw.value).
export function useDocumentApiValidation(source) {
  const state = reactive({
    status: 'idle', // idle | checking | found | not_found | error
    tipo: null, // 'CPF' | 'CNPJ'
    nome: null,
    nascimento: null,
    genero: null,
  })

  let timeout = null
  let ultimaConsulta = ''

  watch(source, (valor) => {
    clearTimeout(timeout)
    const digitos = (valor ?? '').replace(/\D/g, '')

    if (digitos.length !== 11 && digitos.length !== 14) {
      state.status = 'idle'
      state.tipo = null
      state.nome = null
      state.nascimento = null
      state.genero = null
      return
    }

    timeout = setTimeout(async () => {
      if (digitos === ultimaConsulta) return
      ultimaConsulta = digitos
      state.status = 'checking'
      state.tipo = digitos.length === 11 ? 'CPF' : 'CNPJ'

      try {
        const resultado =
          digitos.length === 11
            ? await documentService.validarCpf(digitos)
            : await documentService.validarCnpj(digitos)

        if (resultado.exists) {
          state.status = 'found'
          state.nome = resultado.name ?? null
          state.nascimento = resultado.birth_date ?? null
          state.genero = resultado.gender ?? null
        } else {
          state.status = 'not_found'
          state.nome = null
          state.nascimento = null
          state.genero = null
        }
      } catch {
        state.status = 'error'
        state.nome = null
      }
    }, 600)
  })

  return state
}
