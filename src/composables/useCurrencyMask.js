import { computed, ref } from 'vue'

// Máscara de valor monetário (BRL). Trabalha internamente com centavos
// (apenas dígitos) e expõe o valor formatado para exibição, seguindo o
// mesmo formato de useDocumentMask/usePhoneMask/useCepMask.
export function useCurrencyMask(inicial = '') {
  const raw = ref('') // apenas dígitos, representando centavos
  const MAX_DIGITOS = 12 // trava em valores absurdamente grandes

  function digitosDe(v) {
    return String(v ?? '').replace(/\D/g, '')
  }

  function setValue(v) {
    if (typeof v === 'number') {
      raw.value = v > 0 ? String(Math.round(v * 100)) : ''
    } else {
      raw.value = digitosDe(v).slice(0, MAX_DIGITOS)
    }
  }

  if (inicial !== '' && inicial != null) setValue(inicial)

  const numero = computed(() => (raw.value ? Number(raw.value) / 100 : 0))

  const formatted = computed(() => {
    if (!raw.value) return ''
    return numero.value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  })

  function onInput(event) {
    raw.value = digitosDe(event.target.value).slice(0, MAX_DIGITOS)
    event.target.value = formatted.value
  }

  return { raw, numero, formatted, setValue, onInput }
}