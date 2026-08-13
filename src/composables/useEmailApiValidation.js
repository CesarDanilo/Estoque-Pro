import { reactive, watch } from 'vue'
import { documentService } from '@/services/documentService'

// Verifica a entregabilidade do e-mail (formato, MX, descartável, etc.)
// via AbstractAPI. `source` pode ser um ref ou uma função getter,
// ex: useEmailApiValidation(() => email.value).
export function useEmailApiValidation(source) {
  const state = reactive({
    status: 'idle', // idle | checking | deliverable | undeliverable | error
    mensagem: '',
  })

  let timeout = null
  let ultimaConsulta = ''
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

  watch(source, (valor) => {
    clearTimeout(timeout)
    const emailAtual = (valor ?? '').trim()

    if (!emailAtual || !EMAIL_REGEX.test(emailAtual)) {
      state.status = 'idle'
      state.mensagem = ''
      return
    }

    timeout = setTimeout(async () => {
      if (emailAtual === ultimaConsulta) return
      ultimaConsulta = emailAtual
      state.status = 'checking'

      try {
        const resultado = await documentService.validarEmail(emailAtual)

        if (resultado.is_disposable_email) {
          state.status = 'undeliverable'
          state.mensagem = 'E-mails temporários/descartáveis não são aceitos.'
          return
        }

        if (resultado.deliverability_status === 'undeliverable') {
          state.status = 'undeliverable'
          state.mensagem = 'Este e-mail parece não existir.'
          return
        }

        if (resultado.is_format_valid && resultado.deliverability_status === 'deliverable') {
          state.status = 'deliverable'
          state.mensagem = 'E-mail verificado.'
          return
        }

        // status incerto (ex: 'unknown') — não afirma nada, só some com o aviso
        state.status = 'idle'
        state.mensagem = ''
      } catch {
        state.status = 'error'
        state.mensagem = ''
      }
    }, 700)
  })

  return state
}
