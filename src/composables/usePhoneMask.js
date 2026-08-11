import { computed, ref } from 'vue'

export function usePhoneMask(initialValue = '') {
  const raw = ref(initialValue.replace(/\D/g, '').slice(0, 11))

  const formatted = computed(() => {
    const digits = raw.value
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2')
    }
    return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2')
  })

  function onInput(event) {
    raw.value = event.target.value.replace(/\D/g, '').slice(0, 11)
  }

  function setValue(value) {
    raw.value = String(value ?? '').replace(/\D/g, '').slice(0, 11)
  }

  const isValid = computed(() => raw.value.length === 10 || raw.value.length === 11)

  return { raw, formatted, onInput, setValue, isValid }
}