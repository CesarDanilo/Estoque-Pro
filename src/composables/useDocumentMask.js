import { computed, ref } from 'vue'

function apenasDigitos(valor) {
  return (valor ?? '').replace(/\D/g, '')
}

function formatarCpf(digitos) {
  return digitos
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function formatarCnpj(digitos) {
  return digitos
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function validarCpf(cpf) {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

  let soma = 0
  for (let i = 0; i < 9; i += 1) soma += Number(cpf[i]) * (10 - i)
  let resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  if (resto !== Number(cpf[9])) return false

  soma = 0
  for (let i = 0; i < 10; i += 1) soma += Number(cpf[i]) * (11 - i)
  resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  return resto === Number(cpf[10])
}

function validarCnpj(cnpj) {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false

  const calcularDigito = (base, pesos) => {
    const soma = base
      .split('')
      .reduce((acc, num, i) => acc + Number(num) * pesos[i], 0)
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const digito1 = calcularDigito(cnpj.slice(0, 12), pesos1)
  if (digito1 !== Number(cnpj[12])) return false

  const digito2 = calcularDigito(cnpj.slice(0, 13), pesos2)
  return digito2 === Number(cnpj[13])
}

export function useDocumentMask() {
  const raw = ref('')

  const tipo = computed(() => (raw.value.length > 11 ? 'CNPJ' : 'CPF'))

  const formatted = computed(() =>
    tipo.value === 'CNPJ' ? formatarCnpj(raw.value) : formatarCpf(raw.value),
  )

  const isValid = computed(() =>
    tipo.value === 'CNPJ' ? validarCnpj(raw.value) : validarCpf(raw.value),
  )

  function setValue(valor) {
    raw.value = apenasDigitos(valor).slice(0, 14)
  }

  function onInput(evento) {
    setValue(evento.target.value)
    evento.target.value = formatted.value
  }

  return { raw, formatted, tipo, isValid, setValue, onInput }
}