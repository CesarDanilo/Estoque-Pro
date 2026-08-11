import { computed, ref } from 'vue'

export function useCepMask(initialValue = '') {
  const raw = ref(initialValue.replace(/\D/g, '').slice(0, 8))

  const formatted = computed(() => raw.value.replace(/(\d{5})(\d{1,3})$/, '$1-$2'))

  function onInput(event) {
    raw.value = event.target.value.replace(/\D/g, '').slice(0, 8)
  }

  function setValue(value) {
    raw.value = String(value ?? '').replace(/\D/g, '').slice(0, 8)
  }

  const isValid = computed(() => raw.value.length === 8)

  return { raw, formatted, onInput, setValue, isValid }
}