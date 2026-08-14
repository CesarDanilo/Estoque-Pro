<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { AlertTriangle, Check, CheckCircle2, ChevronsUpDown, Loader2, Save } from 'lucide-vue-next'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

import { useDocumentMask } from '@/composables/useDocumentMask'
import { usePhoneMask } from '@/composables/usePhoneMask'
import { useCepMask } from '@/composables/useCepMask'
import { useEmailValidation } from '@/composables/useEmailValidation'
import { useDocumentApiValidation } from '@/composables/useDocumentApiValidation'
import { useEmailApiValidation } from '@/composables/useEmailApiValidation'
import { pessoaSchema } from '@/schemas/pessoaSchema'
import { useFeedback } from '@/composables/useFeedBack'

const props = defineProps({
  open: { type: Boolean, default: false },
  // quando preenchida, o modal entra em modo edição e popula os campos
  pessoa: { type: Object, default: null },
  // cria pessoa nova — payload completo
  aoCriar: { type: Function, required: true },
  // atualização completa — usada como fallback se aoAtualizarParcial não vier
  aoAtualizar: { type: Function, required: true },
  // atualização parcial (PATCH) — recebe (id, camposAlterados)
  aoAtualizarParcial: { type: Function, default: null },
  // categoria inicial no modo criação ('client' | 'supplier')
  categoriaPadrao: { type: String, default: null },
  // quando true, trava o Select de Categoria (desabilitado)
  categoriaFixa: { type: Boolean, default: false },
  // títulos customizáveis do modal
  tituloCriacao: { type: String, default: 'Nova pessoa' },
  tituloEdicao: { type: String, default: 'Editar pessoa' },
})

const emit = defineEmits(['update:open', 'created', 'updated'])

const { erro } = useFeedback()

// ---- Limites de caracteres ----
const NOME_MAX = 120
const NOME_FANTASIA_MAX = 120
const IE_MAX = 20
const CONTATO_MAX = 120
const EMAIL_MAX = 120
const LOGRADOURO_MAX = 160
const NUMERO_MAX = 20
const COMPLEMENTO_MAX = 60
const BAIRRO_MAX = 80
const CIDADE_MAX = 80

// aceita apenas dígitos (0-9) — usado para validar documento, telefone e cep
const SOMENTE_DIGITOS = /^\d+$/

// lista das 27 unidades federativas, usada no combobox de UF.
const UFS = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
]

const documento = useDocumentMask()
const telefone = usePhoneMask()
const cep = useCepMask()
const email = useEmailValidation()

// validação em tempo real via API
const documentoApi = useDocumentApiValidation(() => documento.raw?.value ?? '')
const emailApi = useEmailApiValidation(() => email.value)

const salvando = ref(false)
const buscandoCep = ref(false)
const erros = reactive({})

const form = reactive({
  category: 'client',
  type: 'individual',
  name: '',
  trade_name: '',
  state_registration: '',
  contact_person: '',
  gender: 'other',
  birth_date: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  active: true,
})

// snapshot dos valores originais — usado pra detectar o que mudou no modo edição
let snapshot = null

const modoEdicao = computed(() => !!props.pessoa)

// título do dialog: usa as props customizáveis
const tituloModal = computed(() => (modoEdicao.value ? props.tituloEdicao : props.tituloCriacao))

// gênero/nascimento só fazem sentido pra pessoa física
const ehPessoaFisica = computed(() => form.type === 'individual')
// nome fantasia/IE/contato só fazem sentido pra pessoa jurídica
const ehPessoaJuridica = computed(() => form.type === 'company')

// exatamente 11 dígitos é um CPF completo — trava o tipo em "física"
const documentoEhCPF = computed(() => (documento.raw?.value ?? '').length === 11)
// mais de 11 dígitos só pode ser CNPJ — trava o tipo em "jurídica"
const documentoEhCNPJ = computed(() => (documento.raw?.value ?? '').length > 11)

// fornecedor só pode ser pessoa jurídica — categoria também trava o tipo
const categoriaEhFornecedor = computed(() => form.category === 'supplier')

// true sempre que algo externo (documento ou categoria) já "decidiu" o tipo
const tipoTravado = computed(
  () => documentoEhCPF.value || documentoEhCNPJ.value || categoriaEhFornecedor.value,
)

const motivoTravamentoTipo = computed(() => {
  if (categoriaEhFornecedor.value) return 'Fornecedores são sempre pessoa jurídica.'
  if (documentoEhCNPJ.value) return 'Definido automaticamente pelo CNPJ.'
  if (documentoEhCPF.value) return 'Definido automaticamente pelo CPF.'
  return ''
})

// compara reativamente o estado atual do form com o snapshot original
const temAlteracoes = computed(() => {
  if (!modoEdicao.value) return true
  if (!snapshot) return true

  return (
    form.category !== snapshot.category ||
    form.type !== snapshot.type ||
    form.name !== snapshot.name ||
    (documento.raw?.value ?? '') !== snapshot.document ||
    form.trade_name !== snapshot.trade_name ||
    form.state_registration !== snapshot.state_registration ||
    form.contact_person !== snapshot.contact_person ||
    form.gender !== snapshot.gender ||
    form.birth_date !== snapshot.birth_date ||
    (telefone.raw?.value ?? '') !== snapshot.phone ||
    email.value !== snapshot.email ||
    (cep.raw?.value ?? '') !== snapshot.zip_code ||
    form.street !== snapshot.street ||
    form.number !== snapshot.number ||
    form.complement !== snapshot.complement ||
    form.neighborhood !== snapshot.neighborhood ||
    form.city !== snapshot.city ||
    form.state !== snapshot.state ||
    form.active !== snapshot.active
  )
})

function dataLocalHoje() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

const hoje = dataLocalHoje()

function paraDataInput(valor) {
  if (!valor) return ''

  const str = String(valor)
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brMatch) {
    const [, dia, mes, ano] = brMatch
    return `${ano}-${mes}-${dia}`
  }

  return str.slice(0, 10)
}

const emailModel = computed({
  get: () => email.value,
  set: (v) => {
    email.value = (v ?? '').slice(0, EMAIL_MAX)
  },
})

const tradeNameModel = computed({
  get: () => form.trade_name,
  set: (v) => {
    form.trade_name = (v ?? '').slice(0, NOME_FANTASIA_MAX)
  },
})

const stateRegistrationModel = computed({
  get: () => form.state_registration,
  set: (v) => {
    form.state_registration = (v ?? '').slice(0, IE_MAX)
  },
})

const contactPersonModel = computed({
  get: () => form.contact_person,
  set: (v) => {
    form.contact_person = (v ?? '').slice(0, CONTATO_MAX)
  },
})

const streetModel = computed({
  get: () => form.street,
  set: (v) => {
    form.street = (v ?? '').slice(0, LOGRADOURO_MAX)
  },
})

const numberModel = computed({
  get: () => form.number,
  set: (v) => {
    form.number = (v ?? '').slice(0, NUMERO_MAX)
  },
})

const complementModel = computed({
  get: () => form.complement,
  set: (v) => {
    form.complement = (v ?? '').slice(0, COMPLEMENTO_MAX)
  },
})

const neighborhoodModel = computed({
  get: () => form.neighborhood,
  set: (v) => {
    form.neighborhood = (v ?? '').slice(0, BAIRRO_MAX)
  },
})

const cityModel = computed({
  get: () => form.city,
  set: (v) => {
    form.city = (v ?? '').slice(0, CIDADE_MAX)
  },
})

const stateModel = computed({
  get: () => form.state,
  set: (v) => {
    form.state = (v ?? '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 2)
  },
})

const ufAberto = ref(false)
const ufSelecionada = computed(() => UFS.find((u) => u.sigla === form.state) || null)

const cidadeAberta = ref(false)
const buscaCidade = ref('')
const municipios = ref([])
const municipiosCarregados = ref(false)
const carregandoMunicipios = ref(false)
const erroCarregarMunicipios = ref(false)

function normalizarTexto(valor) {
  return (valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

async function carregarMunicipios() {
  if (municipiosCarregados.value || carregandoMunicipios.value) return

  carregandoMunicipios.value = true
  erroCarregarMunicipios.value = false
  try {
    const resposta = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios')
    if (!resposta.ok) throw new Error('Falha ao buscar municípios do IBGE')

    const dados = await resposta.json()
    municipios.value = dados
      .map((m) => ({
        nome: m?.nome ?? '',
        uf:
          m?.microrregiao?.mesorregiao?.UF?.sigla ??
          m?.['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla ??
          '',
      }))
      .filter((m) => m.nome && m.uf)
    municipiosCarregados.value = true
  } catch {
    erroCarregarMunicipios.value = true
  } finally {
    carregandoMunicipios.value = false
  }
}

watch(cidadeAberta, (aberto) => {
  if (aberto) carregarMunicipios()
})

const cidadesFiltradas = computed(() => {
  const busca = normalizarTexto(buscaCidade.value)
  if (busca.length < 2) return []

  const encontrados = municipios.value.filter((m) => normalizarTexto(m.nome).includes(busca))

  encontrados.sort((a, b) => {
    if (form.state) {
      const aMesmaUf = a.uf === form.state
      const bMesmaUf = b.uf === form.state
      if (aMesmaUf && !bMesmaUf) return -1
      if (!aMesmaUf && bMesmaUf) return 1
    }

    const aComeca = normalizarTexto(a.nome).startsWith(busca)
    const bComeca = normalizarTexto(b.nome).startsWith(busca)
    if (aComeca && !bComeca) return -1
    if (!aComeca && bComeca) return 1

    return a.nome.localeCompare(b.nome, 'pt-BR')
  })

  return encontrados.slice(0, 30)
})

function selecionarCidade(municipio) {
  form.city = municipio.nome.slice(0, CIDADE_MAX)
  form.state = municipio.uf
  cidadeAberta.value = false
  buscaCidade.value = ''
}

function selecionarUf(sigla) {
  const ufAnterior = form.state
  stateModel.value = sigla
  ufAberto.value = false

  if (sigla !== ufAnterior) {
    form.city = ''
  }
}

const documentoBadge = computed(() => {
  if (!documento.raw?.value) {
    return { texto: 'CPF ou CNPJ', classe: 'bg-muted text-muted-foreground' }
  }
  return documento.tipo.value === 'CPF'
    ? { texto: 'CPF', classe: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' }
    : { texto: 'CNPJ', classe: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' }
})

watch(
  () => props.open,
  (aberto) => {
    if (aberto) preencherFormulario()
  },
)

watch(documentoEhCNPJ, (ehCnpj) => {
  if (ehCnpj) form.type = 'company'
})

watch(documentoEhCPF, (ehCpf) => {
  if (ehCpf && !categoriaEhFornecedor.value) form.type = 'individual'
})

watch(
  () => form.category,
  (category) => {
    if (category === 'supplier') form.type = 'company'
  },
)

watch(
  () => form.type,
  (tipo) => {
    if (tipo === 'company' && documentoEhCPF.value && !categoriaEhFornecedor.value) {
      form.type = 'individual'
      return
    }
    if (tipo === 'individual' && (documentoEhCNPJ.value || categoriaEhFornecedor.value)) {
      form.type = 'company'
      return
    }

    if (tipo === 'company') {
      form.gender = 'other'
      form.birth_date = ''
      delete erros.birth_date
    } else {
      form.trade_name = ''
      form.state_registration = ''
      form.contact_person = ''
      delete erros.trade_name
      delete erros.state_registration
      delete erros.contact_person
    }
  },
)

// Auto-preenchimento assim que a consulta de CPF/CNPJ encontra um registro
watch(
  () => documentoApi.status,
  (status) => {
    if (status !== 'found') return

    if (documentoApi.nome) {
      form.name = documentoApi.nome.slice(0, NOME_MAX)
    }

    if (documentoApi.tipo === 'CPF' && ehPessoaFisica.value) {
      if (documentoApi.nascimento) {
        form.birth_date = paraDataInput(documentoApi.nascimento)
      }
      if (documentoApi.genero) {
        const generoNormalizado = String(documentoApi.genero).toLowerCase()
        if (generoNormalizado === 'male' || generoNormalizado === 'm') {
          form.gender = 'male'
        } else if (generoNormalizado === 'female' || generoNormalizado === 'f') {
          form.gender = 'female'
        }
      }
    }

    if (documentoApi.tipo === 'CNPJ' && ehPessoaJuridica.value) {
      if (documentoApi.fantasia) {
        form.trade_name = documentoApi.fantasia.slice(0, NOME_FANTASIA_MAX)
      }
      if (documentoApi.cidade) {
        form.city = documentoApi.cidade.slice(0, CIDADE_MAX)
      }
      if (documentoApi.uf) {
        form.state = String(documentoApi.uf).toUpperCase().slice(0, 2)
      }
    }
  },
)

// Auto-preenchimento de endereço via ViaCEP
watch(
  () => cep.raw?.value,
  async (valor) => {
    if (!valor || valor.length !== 8) return

    buscandoCep.value = true
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${valor}/json/`)
      const dados = await resposta.json()

      if (dados.erro) return

      form.street = (dados.logradouro ?? '').slice(0, LOGRADOURO_MAX)
      form.neighborhood = (dados.bairro ?? '').slice(0, BAIRRO_MAX)
      form.city = (dados.localidade ?? '').slice(0, CIDADE_MAX)
      form.state = (dados.uf ?? '').toUpperCase().slice(0, 2)
    } catch {
      // Silencioso
    } finally {
      buscandoCep.value = false
    }
  },
)

// Remove erros assim que o usuário digita/corrige
watch(
  () => form.category,
  (valor) => {
    if (erros.category && valor) delete erros.category
  },
)
watch(
  () => form.birth_date,
  (valor) => {
    if (erros.birth_date && (!valor || valor <= hoje)) delete erros.birth_date
  },
)
watch(
  () => email.value,
  (valor) => {
    if (erros.email && (!valor || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor))) delete erros.email
  },
)
watch(
  () => documento.raw?.value,
  (valor) => {
    if (erros.document && (!valor || SOMENTE_DIGITOS.test(valor))) delete erros.document
  },
)
watch(
  () => telefone.raw?.value,
  (valor) => {
    if (erros.phone && (!valor || SOMENTE_DIGITOS.test(valor))) delete erros.phone
  },
)
watch(
  () => cep.raw?.value,
  (valor) => {
    if (erros.zip_code && (!valor || SOMENTE_DIGITOS.test(valor))) delete erros.zip_code
  },
)
watch(
  () => form.name,
  (valor) => {
    if (erros.name && valor.trim().length >= 3) delete erros.name
  },
)
watch(
  () => form.type,
  () => {
    if (erros.type) delete erros.type
  },
)

function preencherFormulario() {
  const p = props.pessoa

  if (p) {
    form.category = p.category ?? 'client'
    form.type = p.type ?? 'individual'
    form.name = p.name ?? ''
    form.trade_name = p.trade_name ?? ''
    form.state_registration = p.state_registration ?? ''
    form.contact_person = p.contact_person ?? ''
    form.gender = p.gender ?? 'other'
    form.birth_date = paraDataInput(p.birth_date)
    form.street = p.street ?? ''
    form.number = p.number ?? ''
    form.complement = p.complement ?? ''
    form.neighborhood = p.neighborhood ?? ''
    form.city = p.city ?? ''
    form.state = p.state ?? ''
    form.active = p.active ?? true

    documento.setValue(p.document ?? '')
    telefone.setValue(p.phone ?? '')
    cep.setValue(p.zip_code ?? '')
    email.value = p.email ?? ''
  } else {
    form.category = props.categoriaPadrao ?? 'client'
    form.type = 'individual'
    form.name = ''
    form.trade_name = ''
    form.state_registration = ''
    form.contact_person = ''
    form.gender = 'other'
    form.birth_date = ''
    form.street = ''
    form.number = ''
    form.complement = ''
    form.neighborhood = ''
    form.city = ''
    form.state = ''
    form.active = true

    documento.setValue('')
    telefone.setValue('')
    cep.setValue('')
    email.value = ''
  }

  // SNAPSHOT EM INGLÊS E PROTEGIDO
  snapshot = p
    ? {
        category: form.category,
        type: form.type,
        name: form.name,
        document: documento.raw?.value ?? '',
        trade_name: form.trade_name,
        state_registration: form.state_registration,
        contact_person: form.contact_person,
        gender: form.gender,
        birth_date: form.birth_date,
        phone: telefone.raw?.value ?? '',
        email: email.value,
        zip_code: cep.raw?.value ?? '',
        street: form.street,
        number: form.number,
        complement: form.complement,
        neighborhood: form.neighborhood,
        city: form.city,
        state: form.state,
        active: form.active,
      }
    : null
}

function fechar() {
  emit('update:open', false)
}

function montarPayload() {
  return {
    category: form.category,
    type: form.type,
    name: form.name,
    document: documento.raw?.value || '',
    trade_name: ehPessoaJuridica.value ? form.trade_name : '',
    state_registration: ehPessoaJuridica.value ? form.state_registration : '',
    contact_person: ehPessoaJuridica.value ? form.contact_person : '',
    gender: ehPessoaFisica.value ? form.gender : null,
    birth_date: ehPessoaFisica.value ? form.birth_date : null,
    phone: telefone.raw?.value || '',
    email: email.value,
    zip_code: cep.raw?.value || '',
    street: form.street,
    number: form.number,
    complement: form.complement,
    neighborhood: form.neighborhood,
    city: form.city,
    state: form.state,
    active: form.active,
  }
}

function validar() {
  Object.keys(erros).forEach((chave) => delete erros[chave])

  const payload = montarPayload()
  const resultado = pessoaSchema.safeParse(payload)

  if (!resultado.success) {
    resultado.error.issues.forEach((issue) => {
      erros[issue.path[0]] = issue.message
    })
  }

  if (!documento.raw?.value) {
    erros.document = 'Informe o CPF ou CNPJ.'
  } else if (!SOMENTE_DIGITOS.test(documento.raw.value)) {
    erros.document = 'Documento deve conter apenas números.'
  } else if (!documento.isValid.value) {
    erros.document = `${documento.tipo.value} inválido.`
  }

  if (telefone.raw?.value && !SOMENTE_DIGITOS.test(telefone.raw.value)) {
    erros.phone = 'Telefone deve conter apenas números.'
  }

  if (cep.raw?.value && !SOMENTE_DIGITOS.test(cep.raw.value)) {
    erros.zip_code = 'CEP deve conter apenas números.'
  }

  if (form.birth_date && form.birth_date > hoje) {
    erros.birth_date = 'Data de nascimento não pode ser no futuro.'
  }

  if (email.value.trim() && email.status === 'invalid') {
    erros.email = 'Informe um e-mail válido.'
  }

  if (Object.keys(erros).length > 0) {
    return null
  }

  return { ...payload, ...(resultado.data ?? {}) }
}

function obterCamposAlterados(payloadAtual) {
  if (!snapshot) return payloadAtual

  const diff = {}
  for (const [campo, valorAtual] of Object.entries(payloadAtual)) {
    if (valorAtual !== snapshot[campo]) {
      diff[campo] = valorAtual
    }
  }
  return diff
}

const ROTULO_CAMPO = {
  category: 'Categoria',
  type: 'Tipo',
  name: 'Nome',
  document: 'CPF/CNPJ',
  trade_name: 'Nome fantasia',
  state_registration: 'Inscrição estadual',
  contact_person: 'Pessoa de contato',
  phone: 'Telefone',
  email: 'E-mail',
  gender: 'Gênero',
  birth_date: 'Data de nascimento',
  zip_code: 'CEP',
  street: 'Logradouro',
  number: 'Número',
  complement: 'Complemento',
  neighborhood: 'Bairro',
  city: 'Cidade',
  state: 'UF',
  active: 'Situação',
}

function traduzirMensagemApi(mensagem, campo) {
  const rotulo = ROTULO_CAMPO[campo] || 'Campo'
  const texto = String(mensagem ?? '').toLowerCase()

  if (texto.includes('is required')) return `${rotulo} é obrigatório.`
  if (texto.includes('already been taken') || texto.includes('unique')) {
    return `${rotulo} já está cadastrado.`
  }
  if (texto.includes('valid email')) return 'Informe um e-mail válido.'
  if (texto.includes('must be a string') || texto.includes('invalid')) {
    return `${rotulo} inválido.`
  }

  return mensagem
}

function aplicarErrosDaApi(e) {
  const apiErrors = e.response?.data?.errors
  const message = e.response?.data?.message ?? ''

  if (apiErrors) {
    Object.entries(apiErrors).forEach(([campo, mensagens]) => {
      const mensagemOriginal = Array.isArray(mensagens) ? mensagens[0] : mensagens

      if (campo === 'document') {
        const textoErro = String(mensagemOriginal).toLowerCase()
        if (
          textoErro.includes('taken') ||
          textoErro.includes('already been taken') ||
          textoErro.includes('ja existe') ||
          textoErro.includes('já existe') ||
          textoErro.includes('unique')
        ) {
          erros.document = 'Já existe um cliente ou fornecedor cadastrado com este CPF/CNPJ.'
          return
        }
      }

      erros[campo] = traduzirMensagemApi(mensagemOriginal, campo)
    })

    erro('Confira os campos destacados antes de salvar.')
  } else {
    const msgBaixa = String(message).toLowerCase()
    if (
      msgBaixa.includes('taken') ||
      msgBaixa.includes('already been taken') ||
      msgBaixa.includes('ja existe') ||
      msgBaixa.includes('já existe')
    ) {
      erros.document = 'Já existe um cliente ou fornecedor cadastrado com este CPF/CNPJ.'
      erro('Já existe um registro com este CPF/CNPJ.')
    } else {
      erro(message || 'Não foi possível salvar. Tente novamente.')
    }
  }
}

async function salvar() {
  const payloadValidado = validar()
  if (!payloadValidado) return

  salvando.value = true
  try {
    if (modoEdicao.value) {
      if (props.aoAtualizarParcial) {
        const payloadPatch = obterCamposAlterados(payloadValidado)
        await props.aoAtualizarParcial(props.pessoa.id, payloadPatch)
      } else {
        await props.aoAtualizar(props.pessoa.id, payloadValidado)
      }
      emit('updated')
    } else {
      await props.aoCriar(payloadValidado)
      emit('created')
    }
    fechar()
  } catch (e) {
    aplicarErrosDaApi(e)
  } finally {
    salvando.value = false
  }
}
</script>
<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent
      class="w-[1120px] max-w-[97vw] max-h-[88vh] overflow-y-auto p-4 sm:p-5 lg:max-w-[1120px]"
    >
      <DialogHeader class="space-y-0.5 pb-1">
        <DialogTitle class="text-lg font-semibold tracking-tight sm:text-xl">
          {{ tituloModal }}
        </DialogTitle>
        <DialogDescription class="text-xs text-muted-foreground sm:text-sm">
          Os campos marcados com <span class="text-destructive">*</span> são obrigatórios.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4 pt-1" @submit.prevent="salvar">
        <section class="space-y-2">
          <h3 class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Identificação
          </h3>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-12">
            <div class="col-span-1 lg:col-span-2">
              <label for="categoria" class="mb-1 block text-xs font-medium text-foreground">
                Categoria <span class="text-destructive">*</span>
              </label>
              <Select v-model="form.category" :disabled="categoriaFixa">
                <SelectTrigger id="categoria" class="h-9 w-full cursor-pointer text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client" class="cursor-pointer">Cliente</SelectItem>
                  <SelectItem value="supplier" class="cursor-pointer">Fornecedor</SelectItem>
                </SelectContent>
              </Select>
              <p v-if="categoriaFixa" class="mt-0.5 truncate text-[10px] text-muted-foreground">
                Definido automaticamente para este cadastro.
              </p>
              <p v-if="erros.category" class="mt-0.5 text-[10px] text-destructive">
                {{ erros.category }}
              </p>
            </div>

            <div class="col-span-1 lg:col-span-2">
              <label for="type" class="mb-1 block text-xs font-medium text-foreground">
                Tipo <span class="text-destructive">*</span>
              </label>
              <Select v-model="form.type" :disabled="tipoTravado">
                <SelectTrigger id="type" class="h-9 w-full cursor-pointer text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual" class="cursor-pointer">Pessoa física</SelectItem>
                  <SelectItem value="company" class="cursor-pointer">Pessoa jurídica</SelectItem>
                </SelectContent>
              </Select>
              <p
                v-if="motivoTravamentoTipo"
                class="mt-0.5 truncate text-[10px] text-muted-foreground"
              >
                {{ motivoTravamentoTipo }}
              </p>
              <p v-if="erros.type" class="mt-0.5 text-[10px] text-destructive">{{ erros.type }}</p>
            </div>

            <div class="col-span-2 lg:col-span-3">
              <label
                for="documento"
                class="mb-1 flex items-center gap-2 text-xs font-medium text-foreground"
              >
                <span
                  class="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors"
                  :class="documentoBadge.classe"
                >
                  {{ documentoBadge.texto }}
                </span>
                <span class="text-destructive">*</span>
              </label>
              <input
                id="documento"
                :value="documento.formatted.value"
                :maxlength="18"
                inputmode="numeric"
                placeholder="000.000.000-00"
                class="h-9 w-full cursor-text rounded-md border border-input bg-transparent px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
                :aria-invalid="!!erros.document"
                @input="documento.onInput"
              />
              <p v-if="erros.document" class="mt-0.5 text-[10px] text-destructive">
                {{ erros.document }}
              </p>
              <p
                v-else-if="documentoApi.status !== 'idle'"
                class="mt-0.5 flex items-center gap-1 truncate text-[10px]"
                :class="{
                  'text-muted-foreground': documentoApi.status === 'checking',
                  'text-emerald-600 dark:text-emerald-400': documentoApi.status === 'found',
                  'text-amber-600 dark:text-amber-400': documentoApi.status === 'not_found',
                  'text-muted-foreground/70': documentoApi.status === 'error',
                }"
              >
                <Loader2
                  v-if="documentoApi.status === 'checking'"
                  class="size-3 shrink-0 animate-spin"
                />
                <CheckCircle2 v-else-if="documentoApi.status === 'found'" class="size-3 shrink-0" />
                <span v-if="documentoApi.status === 'checking'">
                  Consultando {{ documentoApi.tipo }}…
                </span>
                <span v-else-if="documentoApi.status === 'found'" class="truncate">
                  {{ documentoApi.tipo }} localizado{{
                    documentoApi.nome ? `: ${documentoApi.nome}` : ''
                  }}
                </span>
                <span v-else-if="documentoApi.status === 'not_found'">
                  {{ documentoApi.tipo }} válido, não cadastrado.
                </span>
                <span v-else-if="documentoApi.status === 'error'">
                  Não foi possível consultar agora.
                </span>
              </p>
              <p v-else class="mt-0.5 text-[10px] text-muted-foreground">
                CPF ou CNPJ, automático.
              </p>
            </div>

            <div class="col-span-2 lg:col-span-5">
              <label for="nome" class="mb-1 block text-xs font-medium text-foreground">
                {{ ehPessoaJuridica ? 'Razão social' : 'Nome completo' }}
                <span class="text-destructive">*</span>
              </label>
              <div class="relative">
                <Input
                  id="nome"
                  v-model="form.name"
                  :placeholder="
                    ehPessoaJuridica ? 'Ex.: Comércio Boa Vista Ltda' : 'Ex.: Ana Beatriz Souza'
                  "
                  :maxlength="NOME_MAX"
                  class="h-9 cursor-text pr-12 text-xs"
                  :aria-invalid="!!erros.name"
                />
                <span
                  class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 select-none text-[10px] font-medium tabular-nums transition-colors"
                  :class="
                    (form.name?.length || 0) >= NOME_MAX
                      ? 'text-red-500'
                      : 'text-muted-foreground/40'
                  "
                >
                  {{ form.name?.length || 0 }}/{{ NOME_MAX }}
                </span>
              </div>
              <p v-if="erros.name" class="mt-0.5 text-[10px] text-destructive">{{ erros.name }}</p>
            </div>
          </div>
        </section>

        <section class="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div
            class="space-y-2 rounded-lg border border-dashed border-border p-3 transition-opacity"
            :class="{ 'pointer-events-none opacity-40': !ehPessoaJuridica }"
          >
            <h3
              class="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Pessoa jurídica
              <span
                v-if="!ehPessoaJuridica"
                class="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium normal-case tracking-normal text-muted-foreground"
              >
                indisponível para PF
              </span>
            </h3>

            <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <label
                  for="nome-fantasia"
                  class="mb-1 block text-[11px] font-medium text-foreground"
                >
                  Nome fantasia
                </label>
                <Input
                  id="nome-fantasia"
                  v-model="tradeNameModel"
                  placeholder="Ex.: Boa Vista"
                  :maxlength="NOME_FANTASIA_MAX"
                  :disabled="!ehPessoaJuridica"
                  class="h-9 cursor-text text-xs"
                />
              </div>

              <div>
                <label for="ie" class="mb-1 block text-[11px] font-medium text-foreground">
                  Inscrição estadual
                </label>
                <Input
                  id="ie"
                  v-model="stateRegistrationModel"
                  placeholder="Ex.: ISENTO"
                  :maxlength="IE_MAX"
                  :disabled="!ehPessoaJuridica"
                  class="h-9 cursor-text text-xs"
                />
              </div>

              <div>
                <label
                  for="pessoa-contato"
                  class="mb-1 block text-[11px] font-medium text-foreground"
                >
                  Pessoa de contato
                </label>
                <Input
                  id="pessoa-contato"
                  v-model="contactPersonModel"
                  placeholder="Ex.: Carlos"
                  :maxlength="CONTATO_MAX"
                  :disabled="!ehPessoaJuridica"
                  class="h-9 cursor-text text-xs"
                />
              </div>
            </div>
          </div>

          <div
            class="space-y-2 rounded-lg border border-dashed border-border p-3 transition-opacity"
            :class="{ 'pointer-events-none opacity-40': !ehPessoaFisica }"
          >
            <h3
              class="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Pessoa física
              <span
                v-if="!ehPessoaFisica"
                class="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium normal-case tracking-normal text-muted-foreground"
              >
                indisponível para PJ
              </span>
            </h3>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label for="genero" class="mb-1 block text-[11px] font-medium text-foreground">
                  Gênero
                </label>
                <Select v-model="form.gender" :disabled="!ehPessoaFisica">
                  <SelectTrigger id="genero" class="h-9 w-full cursor-pointer text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female" class="cursor-pointer">Feminino</SelectItem>
                    <SelectItem value="male" class="cursor-pointer">Masculino</SelectItem>
                    <SelectItem value="other" class="cursor-pointer">Não informar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label for="nascimento" class="mb-1 block text-[11px] font-medium text-foreground">
                  Nascimento
                </label>
                <Input
                  id="nascimento"
                  v-model="form.birth_date"
                  type="date"
                  :max="hoje"
                  :disabled="!ehPessoaFisica"
                  class="h-9 cursor-text text-xs"
                  :aria-invalid="!!erros.birth_date"
                />
                <p v-if="erros.birth_date" class="mt-0.5 text-[10px] text-destructive">
                  {{ erros.birth_date }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section class="space-y-2 border-t border-border pt-3">
          <h3 class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Contato
          </h3>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-[200px_1fr]">
            <div>
              <label for="telefone" class="mb-1 block text-xs font-medium text-foreground">
                Telefone
              </label>
              <input
                id="telefone"
                :value="telefone.formatted.value"
                :maxlength="15"
                inputmode="numeric"
                placeholder="(67) 99999-0000"
                class="h-9 w-full cursor-text rounded-md border border-input bg-transparent px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
                :aria-invalid="!!erros.phone"
                @input="telefone.onInput"
              />
              <p v-if="erros.phone" class="mt-0.5 text-[10px] text-destructive">
                {{ erros.phone }}
              </p>
            </div>

            <div>
              <label for="email" class="mb-1 block text-xs font-medium text-foreground">
                E-mail
              </label>
              <div class="relative">
                <input
                  id="email"
                  v-model="emailModel"
                  :maxlength="EMAIL_MAX"
                  type="email"
                  placeholder="nome@email.com"
                  class="h-9 w-full cursor-text rounded-md border bg-transparent px-3 pr-14 text-xs outline-none focus:ring-2 focus:ring-ring"
                  :aria-invalid="email.status === 'invalid' || !!erros.email"
                  :class="{
                    'border-destructive': email.status === 'invalid' || erros.email,
                    'border-emerald-500': email.status === 'valid' && !erros.email,
                    'border-input': email.status === 'idle' && !erros.email,
                  }"
                />
                <span
                  class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 select-none text-[10px] font-medium tabular-nums transition-colors"
                  :class="
                    email.value.length >= EMAIL_MAX ? 'text-red-500' : 'text-muted-foreground/40'
                  "
                >
                  {{ email.value.length }}/{{ EMAIL_MAX }}
                </span>
              </div>
              <p
                v-if="email.status === 'invalid' || erros.email"
                class="mt-0.5 text-[10px] text-destructive"
              >
                {{ erros.email || 'Informe um e-mail válido.' }}
              </p>
              <p
                v-else-if="emailApi.status !== 'idle'"
                class="mt-0.5 flex items-center gap-1 truncate text-[10px]"
                :class="{
                  'text-muted-foreground': emailApi.status === 'checking',
                  'text-emerald-600 dark:text-emerald-400': emailApi.status === 'deliverable',
                  'text-amber-600 dark:text-amber-400': emailApi.status === 'undeliverable',
                }"
              >
                <Loader2
                  v-if="emailApi.status === 'checking'"
                  class="size-3 shrink-0 animate-spin"
                />
                <CheckCircle2
                  v-else-if="emailApi.status === 'deliverable'"
                  class="size-3 shrink-0"
                />
                <AlertTriangle
                  v-else-if="emailApi.status === 'undeliverable'"
                  class="size-3 shrink-0"
                />
                {{ emailApi.status === 'checking' ? 'Verificando e-mail…' : emailApi.mensagem }}
              </p>
            </div>
          </div>
        </section>

        <section class="space-y-2 border-t border-border pt-3">
          <h3 class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Endereço
          </h3>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-6 lg:grid-cols-12">
            <div class="col-span-2 sm:col-span-2 lg:col-span-2">
              <label for="cep" class="mb-1 block text-xs font-medium text-foreground">CEP</label>
              <div class="relative">
                <input
                  id="cep"
                  :value="cep.formatted.value"
                  :maxlength="9"
                  inputmode="numeric"
                  placeholder="79000-000"
                  class="h-9 w-full cursor-text rounded-md border border-input bg-transparent px-3 pr-8 text-xs outline-none focus:ring-2 focus:ring-ring"
                  :aria-invalid="!!erros.zip_code"
                  @input="cep.onInput"
                />
                <Loader2
                  v-if="buscandoCep"
                  class="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground"
                />
              </div>
              <p v-if="erros.zip_code" class="mt-0.5 text-[10px] text-destructive">
                {{ erros.zip_code }}
              </p>
            </div>

            <div class="col-span-2 sm:col-span-4 lg:col-span-6">
              <label for="logradouro" class="mb-1 block text-xs font-medium text-foreground">
                Logradouro
              </label>
              <Input
                id="logradouro"
                v-model="streetModel"
                placeholder="Rua, Avenida, Alameda…"
                :maxlength="LOGRADOURO_MAX"
                class="h-9 cursor-text text-xs"
              />
            </div>

            <div class="col-span-1 sm:col-span-2 lg:col-span-2">
              <label for="numero" class="mb-1 block text-xs font-medium text-foreground">
                Número
              </label>
              <Input
                id="numero"
                v-model="numberModel"
                placeholder="Ex.: 1020"
                :maxlength="NUMERO_MAX"
                class="h-9 cursor-text text-xs"
              />
            </div>

            <div class="col-span-1 sm:col-span-2 lg:col-span-2">
              <label for="uf" class="mb-1 block text-xs font-medium text-foreground">UF</label>
              <Popover v-model:open="ufAberto">
                <PopoverTrigger as-child>
                  <Button
                    id="uf"
                    type="button"
                    variant="outline"
                    role="combobox"
                    :aria-expanded="ufAberto"
                    class="h-9 w-full cursor-pointer justify-between px-3 text-xs font-normal"
                    :aria-invalid="!!erros.state"
                  >
                    <span :class="!form.state ? 'text-muted-foreground' : ''">
                      {{
                        form.state
                          ? `${form.state} — ${ufSelecionada?.nome ?? ''}`
                          : 'Selecione a UF'
                      }}
                    </span>
                    <ChevronsUpDown class="size-3.5 shrink-0 text-muted-foreground/60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-[240px] cursor-auto p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar estado..." class="cursor-text text-xs" />
                    <CommandList>
                      <CommandEmpty class="py-3 text-center text-xs text-muted-foreground">
                        Nenhum estado encontrado.
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          v-for="uf in UFS"
                          :key="uf.sigla"
                          :value="`${uf.sigla} ${uf.nome}`"
                          class="cursor-pointer text-xs"
                          @select="selecionarUf(uf.sigla)"
                        >
                          <Check
                            :class="
                              cn(
                                'mr-2 size-3.5',
                                form.state === uf.sigla ? 'opacity-100' : 'opacity-0',
                              )
                            "
                          />
                          <span class="font-medium">{{ uf.sigla }}</span>
                          <span class="ml-1.5 text-muted-foreground">{{ uf.nome }}</span>
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p v-if="erros.state" class="mt-0.5 text-[10px] text-destructive">
                {{ erros.state }}
              </p>
            </div>

            <div class="col-span-2 sm:col-span-3 lg:col-span-4">
              <label for="complemento" class="mb-1 block text-xs font-medium text-foreground">
                Complemento
              </label>
              <Input
                id="complemento"
                v-model="complementModel"
                placeholder="Apto, bloco, sala…"
                :maxlength="COMPLEMENTO_MAX"
                class="h-9 cursor-text text-xs"
              />
            </div>

            <div class="col-span-2 sm:col-span-3 lg:col-span-4">
              <label for="bairro" class="mb-1 block text-xs font-medium text-foreground">
                Bairro
              </label>
              <Input
                id="bairro"
                v-model="neighborhoodModel"
                placeholder="Ex.: Centro"
                :maxlength="BAIRRO_MAX"
                class="h-9 cursor-text text-xs"
              />
            </div>

            <div class="col-span-2 sm:col-span-6 lg:col-span-4">
              <label for="cidade" class="mb-1 block text-xs font-medium text-foreground">
                Cidade
              </label>

              <template v-if="!erroCarregarMunicipios">
                <Popover v-model:open="cidadeAberta">
                  <PopoverTrigger as-child>
                    <Button
                      id="cidade"
                      type="button"
                      variant="outline"
                      role="combobox"
                      :aria-expanded="cidadeAberta"
                      class="h-9 w-full cursor-pointer justify-between px-3 text-xs font-normal"
                    >
                      <span :class="!form.city ? 'text-muted-foreground' : ''" class="truncate">
                        {{ form.city || 'Selecione a cidade' }}
                      </span>
                      <Loader2
                        v-if="carregandoMunicipios"
                        class="size-3.5 shrink-0 animate-spin text-muted-foreground/60"
                      />
                      <ChevronsUpDown v-else class="size-3.5 shrink-0 text-muted-foreground/60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent class="w-[280px] cursor-auto p-0" align="start">
                    <Command>
                      <CommandInput
                        v-model="buscaCidade"
                        placeholder="Digite ao menos 2 letras..."
                        class="cursor-text text-xs"
                      />
                      <CommandList>
                        <CommandEmpty class="py-3 text-center text-xs text-muted-foreground">
                          {{
                            buscaCidade.trim().length < 2
                              ? 'Digite ao menos 2 letras para buscar.'
                              : 'Nenhuma cidade encontrada.'
                          }}
                        </CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            v-for="cidade in cidadesFiltradas"
                            :key="`${cidade.nome}-${cidade.uf}`"
                            :value="`${cidade.nome} ${cidade.uf}`"
                            class="cursor-pointer text-xs"
                            @select="selecionarCidade(cidade)"
                          >
                            <Check
                              :class="
                                cn(
                                  'mr-2 size-3.5',
                                  form.city === cidade.nome && form.state === cidade.uf
                                    ? 'opacity-100'
                                    : 'opacity-0',
                                )
                              "
                            />
                            <span class="font-medium">{{ cidade.nome }}</span>
                            <span class="ml-1.5 text-muted-foreground">— {{ cidade.uf }}</span>
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p class="mt-0.5 truncate text-[10px] text-muted-foreground">
                  Selecionar a cidade preenche a UF automaticamente.
                </p>
              </template>

              <template v-else>
                <Input
                  id="cidade"
                  v-model="cityModel"
                  placeholder="Ex.: Dourados"
                  :maxlength="CIDADE_MAX"
                  class="h-9 cursor-text text-xs"
                />
                <p class="mt-0.5 truncate text-[10px] text-muted-foreground">
                  Não foi possível carregar a lista de cidades. Digite manualmente.
                </p>
              </template>
            </div>
          </div>
        </section>

        <section
          class="flex items-center justify-between gap-3 rounded-md border border-input px-3 py-2"
        >
          <div>
            <label for="ativo" class="text-xs font-medium text-foreground">Pessoa ativa</label>
            <p class="text-[10px] text-muted-foreground">
              Inativas não aparecem em novas vendas ou compras.
            </p>
          </div>
          <Switch
            id="ativo"
            v-model="form.active"
            class="cursor-pointer data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-input"
          />
        </section>

        <DialogFooter class="flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            class="h-9 cursor-pointer text-xs"
            @click="fechar"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            :disabled="salvando || (modoEdicao && !temAlteracoes)"
            class="h-9 cursor-pointer bg-emerald-500 text-xs text-black hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Loader2 v-if="salvando" class="size-4 animate-spin" />
            <Save v-else class="size-4" />
            {{ salvando ? 'Salvando…' : modoEdicao ? 'Salvar alterações' : 'Salvar pessoa' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
