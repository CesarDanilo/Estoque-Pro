import { ref, watch } from 'vue'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function useEmailValidation(initialValue = '') {
  const value = ref(initialValue)
  const status = ref('idle')
  let timeout = null

  watch(value, (novo) => {
    clearTimeout(timeout)
    if (!novo) {
      status.value = 'idle'
      return
    }
    timeout = setTimeout(() => {
      status.value = EMAIL_REGEX.test(novo) ? 'valid' : 'invalid'
    }, 250)
  })

  function onInput(event) {
    value.value = event.target.value.slice(0, 254)
  }

  return { value, status, onInput }
}