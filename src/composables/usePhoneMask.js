import { computed, ref } from 'vue'

function apenasDigitos(valor) {
  return (valor ?? '').replace(/\D/g, '')
}

function formatarTelefone(digitos) {
  if (digitos.length <= 10) {
    return digitos
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  }
  return digitos
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

export function usePhoneMask() {
  const raw = ref('')

  const formatted = computed(() => formatarTelefone(raw.value))

  function setValue(valor) {
    raw.value = apenasDigitos(valor).slice(0, 11)
  }

  function onInput(evento) {
    setValue(evento.target.value)
    evento.target.value = formatted.value
  }

  return { raw, formatted, setValue, onInput }
}