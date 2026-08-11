import { reactive, watch } from 'vue'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function useEmailValidation(initialValue = '') {
  const state = reactive({
    value: initialValue,
    status: 'idle', // idle | valid | invalid
  })

  let timeout = null

  watch(
    () => state.value,
    (novo) => {
      clearTimeout(timeout)
      if (!novo) {
        state.status = 'idle'
        return
      }
      timeout = setTimeout(() => {
        state.status = EMAIL_REGEX.test(novo) ? 'valid' : 'invalid'
      }, 250)
    },
  )

  function onInput(event) {
    state.value = event.target.value.slice(0, 254)
  }

  return state
}