import { ref } from 'vue'

// Estado fora da função = singleton. Todo componente que importar
// `useFeedback` compartilha a mesma referência (igual um "mini store").
const feedback = ref(null) // { tipo: 'success' | 'info' | 'error', titulo, descricao }
let timer = null

function mostrarFeedback(tipo, titulo, descricao, duracao = 4000) {
  feedback.value = { tipo, titulo, descricao }
  clearTimeout(timer)
  timer = setTimeout(() => {
    feedback.value = null
  }, duracao)
}

function sucesso(titulo, descricao, duracao) {
  mostrarFeedback('success', titulo, descricao, duracao)
}

function info(titulo, descricao, duracao) {
  mostrarFeedback('info', titulo, descricao, duracao)
}

function erro(titulo, descricao, duracao) {
  mostrarFeedback('error', titulo, descricao, duracao)
}

function fecharFeedback() {
  clearTimeout(timer)
  feedback.value = null
}

export function useFeedback() {
  return { feedback, mostrarFeedback, sucesso, info, erro, fecharFeedback }
}
