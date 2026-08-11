import { computed, ref } from 'vue'

function apenasDigitos(valor) {
  return (valor ?? '').replace(/\D/g, '')
}

function formatarCep(digitos) {
  return digitos.replace(/(\d{5})(\d{1,3})$/, '$1-$2')
}

export function useCepMask() {
  const raw = ref('')

  const formatted = computed(() => formatarCep(raw.value))

  function setValue(valor) {
    raw.value = apenasDigitos(valor).slice(0, 8)
  }

  function onInput(evento) {
    setValue(evento.target.value)
    evento.target.value = formatted.value
  }

  return { raw, formatted, setValue, onInput }
}