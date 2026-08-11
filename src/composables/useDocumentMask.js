import { computed, ref } from 'vue'

export function useDocumentMask(initialValue = '') {
  const raw = ref(initialValue.replace(/\D/g, '').slice(0, 14))

  const tipo = computed(() => (raw.value.length <= 11 ? 'CPF' : 'CNPJ'))

  const formatted = computed(() => {
    const digits = raw.value
    if (tipo.value === 'CPF') {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
  })

  function onInput(event) {
    raw.value = event.target.value.replace(/\D/g, '').slice(0, 14)
  }

  function setValue(value) {
    raw.value = String(value ?? '').replace(/\D/g, '').slice(0, 14)
  }

  const isValid = computed(() => (tipo.value === 'CPF' ? validarCPF(raw.value) : validarCNPJ(raw.value)))

  return { raw, formatted, tipo, onInput, setValue, isValid }
}

function validarCPF(cpf) {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  let soma = 0
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i)
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpf[9])) return false
  soma = 0
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i)
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  return resto === parseInt(cpf[10])
}

function validarCNPJ(cnpj) {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false
  const calc = (base) => {
    const pesos =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let soma = 0
    for (let i = 0; i < base.length; i++) soma += parseInt(base[i]) * pesos[i]
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  if (calc(cnpj.slice(0, 12)) !== parseInt(cnpj[12])) return false
  return calc(cnpj.slice(0, 13)) === parseInt(cnpj[13])
}