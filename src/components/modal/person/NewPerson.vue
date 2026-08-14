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
  // cria pessoa nova — payload completo (vem do usePeople, no componente pai)
  aoCriar: { type: Function, required: true },
  // atualização completa — usada como fallback se aoAtualizarParcial não vier
  aoAtualizar: { type: Function, required: true },
  // atualização parcial (PATCH) — recebe (id, camposAlteradosNoFormatoDaApi)
  aoAtualizarParcial: { type: Function, default: null },
  // 🟢 NOVO: categoria inicial no modo criação ('client' | 'supplier').
  // Não tem efeito no modo edição (lá a categoria vem do registro).
  categoriaPadrao: { type: String, default: null },
  // 🟢 NOVO: quando true, trava o Select de Categoria (desabilitado).
  // Útil para modais especializados, como "cadastro de fornecedor".
  categoriaFixa: { type: Boolean, default: false },
  // 🟢 NOVO: títulos customizáveis do modal.
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

// 🟢 NOVO: lista das 27 unidades federativas, usada no combobox de UF.
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

// 🟢 validação em tempo real via API (CPFHub / BrasilAPI / AbstractAPI).
// Não bloqueia o envio: só informa/preenche automaticamente quando possível.
const documentoApi = useDocumentApiValidation(() => documento.raw.value)
const emailApi = useEmailApiValidation(() => email.value)

const salvando = ref(false)
const buscandoCep = ref(false)
const erros = reactive({})

const form = reactive({
  categoria: 'client', // 'client' | 'supplier'
  type: 'individual', // 'individual' | 'company'
  name: '',
  // Exclusivos de Pessoa Jurídica
  nomeFantasia: '',
  inscricaoEstadual: '',
  pessoaContato: '',
  // Exclusivos de Pessoa Física
  genero: 'other', // 'male' | 'female' | 'other'
  nascimento: '',
  // Endereço estruturado
  cep_: '', // placeholder — cep é controlado pelo composable `cep`
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  ativo: true,
})

// snapshot dos valores originais (formato "front") — usado pra detectar o que mudou no modo edição
let snapshot = null

const modoEdicao = computed(() => !!props.pessoa)

// título do dialog: usa as props customizáveis (default = "Nova/Editar pessoa")
const tituloModal = computed(() => (modoEdicao.value ? props.tituloEdicao : props.tituloCriacao))

// gênero/nascimento só fazem sentido pra pessoa física
const ehPessoaFisica = computed(() => form.type === 'individual')
// nome fantasia/IE/contato só fazem sentido pra pessoa jurídica
const ehPessoaJuridica = computed(() => form.type === 'company')

// exatamente 11 dígitos é um CPF completo — trava o tipo em "física"
const documentoEhCPF = computed(() => documento.raw.value.length === 11)
// mais de 11 dígitos só pode ser CNPJ — trava o tipo em "jurídica"
const documentoEhCNPJ = computed(() => documento.raw.value.length > 11)

// fornecedor só pode ser pessoa jurídica — categoria também trava o tipo
const categoriaEhFornecedor = computed(() => form.categoria === 'supplier')

// true sempre que algo externo (documento ou categoria) já "decidiu" o tipo —
// usado pra desabilitar o Select de Tipo
const tipoTravado = computed(
  () => documentoEhCPF.value || documentoEhCNPJ.value || categoriaEhFornecedor.value,
)

const motivoTravamentoTipo = computed(() => {
  if (categoriaEhFornecedor.value) return 'Fornecedores são sempre pessoa jurídica.'
  if (documentoEhCNPJ.value) return 'Definido automaticamente pelo CNPJ.'
  if (documentoEhCPF.value) return 'Definido automaticamente pelo CPF.'
  return ''
})

// compara reativamente o estado atual do form com o snapshot original —
// no modo criação sempre é true (não há "original" pra comparar)
const temAlteracoes = computed(() => {
  if (!modoEdicao.value) return true
  if (!snapshot) return true

  return (
    form.categoria !== snapshot.categoria ||
    form.type !== snapshot.type ||
    form.nome !== snapshot.nome ||
    documento.raw.value !== snapshot.documento ||
    form.nomeFantasia !== snapshot.nomeFantasia ||
    form.inscricaoEstadual !== snapshot.inscricaoEstadual ||
    form.pessoaContato !== snapshot.pessoaContato ||
    form.genero !== snapshot.genero ||
    form.nascimento !== snapshot.nascimento ||
    telefone.raw.value !== snapshot.telefone ||
    email.value !== snapshot.email ||
    cep.raw.value !== snapshot.cep ||
    form.logradouro !== snapshot.logradouro ||
    form.numero !== snapshot.numero ||
    form.complemento !== snapshot.complemento ||
    form.bairro !== snapshot.bairro ||
    form.cidade !== snapshot.cidade ||
    form.uf !== snapshot.uf ||
    form.ativo !== snapshot.ativo
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

// normaliza datas vindas da API pro formato do <input type="date"> (AAAA-MM-DD).
// A API de documento retorna a data de nascimento no formato brasileiro
// "DD/MM/AAAA" (ex.: "20/02/2001"); aqui detectamos esse padrão e convertemos.
function paraDataInput(valor) {
  if (!valor) return ''

  const str = String(valor)

  // formato brasileiro vindo da API de CPF/CNPJ: DD/MM/AAAA
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brMatch) {
    const [, dia, mes, ano] = brMatch
    return `${ano}-${mes}-${dia}`
  }

  // já em formato ISO (AAAA-MM-DD ou AAAA-MM-DDTHH:mm:ss...)
  return str.slice(0, 10)
}

const emailModel = computed({
  get: () => email.value,
  set: (v) => {
    email.value = (v ?? '').slice(0, EMAIL_MAX)
  },
})

const nomeFantasiaModel = computed({
  get: () => form.nomeFantasia,
  set: (v) => {
    form.nomeFantasia = (v ?? '').slice(0, NOME_FANTASIA_MAX)
  },
})

const inscricaoEstadualModel = computed({
  get: () => form.inscricaoEstadual,
  set: (v) => {
    form.inscricaoEstadual = (v ?? '').slice(0, IE_MAX)
  },
})

const pessoaContatoModel = computed({
  get: () => form.pessoaContato,
  set: (v) => {
    form.pessoaContato = (v ?? '').slice(0, CONTATO_MAX)
  },
})

const logradouroModel = computed({
  get: () => form.logradouro,
  set: (v) => {
    form.logradouro = (v ?? '').slice(0, LOGRADOURO_MAX)
  },
})

const numeroModel = computed({
  get: () => form.numero,
  set: (v) => {
    form.numero = (v ?? '').slice(0, NUMERO_MAX)
  },
})

const complementoModel = computed({
  get: () => form.complemento,
  set: (v) => {
    form.complemento = (v ?? '').slice(0, COMPLEMENTO_MAX)
  },
})

const bairroModel = computed({
  get: () => form.bairro,
  set: (v) => {
    form.bairro = (v ?? '').slice(0, BAIRRO_MAX)
  },
})

const cidadeModel = computed({
  get: () => form.cidade,
  set: (v) => {
    form.cidade = (v ?? '').slice(0, CIDADE_MAX)
  },
})

const ufModel = computed({
  get: () => form.uf,
  set: (v) => {
    form.uf = (v ?? '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 2)
  },
})

// 🟢 NOVO: estado do combobox de UF (Popover + Command).
const ufAberto = ref(false)

// nome completo da UF selecionada — mostrado no botão do combobox
const ufSelecionada = computed(() => UFS.find((u) => u.sigla === form.uf) || null)

// 🟢 NOVO: combobox de Cidade (Popover + Command), nos mesmos moldes do de UF.
// Diferente da UF (lista fixa de 27 itens), a lista de cidades vem da API do
// IBGE com TODOS os municípios do Brasil — carregada uma única vez, sob
// demanda (só quando o usuário abre o combobox pela primeira vez).
// Isso permite digitar a cidade sem precisar escolher a UF antes: ao
// selecionar a cidade, a UF correspondente é preenchida automaticamente.
const cidadeAberta = ref(false)
const buscaCidade = ref('')
const municipios = ref([]) // [{ nome, uf }] — todos os municípios do Brasil
const municipiosCarregados = ref(false)
const carregandoMunicipios = ref(false)
const erroCarregarMunicipios = ref(false)

// remove acentos e normaliza caixa — usado pra comparar nomes de cidade
// digitados livremente (ex.: "sao paulo" precisa encontrar "São Paulo")
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
        // a API do IBGE aninha a UF dentro de microrregiao/mesorregiao;
        // o fallback cobre a variação mais nova (regiao-imediata), caso a
        // estrutura mude no futuro.
        uf:
          m?.microrregiao?.mesorregiao?.UF?.sigla ??
          m?.['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla ??
          '',
      }))
      .filter((m) => m.nome && m.uf)
    municipiosCarregados.value = true
  } catch {
    // API fora do ar / sem internet: o template cai no fallback de texto livre
    erroCarregarMunicipios.value = true
  } finally {
    carregandoMunicipios.value = false
  }
}

// carrega a lista nacional assim que o combobox de cidade é aberto pela
// primeira vez (evita baixar ~5.500 municípios sem necessidade)
watch(cidadeAberta, (aberto) => {
  if (aberto) carregarMunicipios()
})

// filtra localmente (sem nova requisição a cada letra digitada), exige ao
// menos 2 letras, e prioriza: 1) cidades da UF já selecionada, 2) cidades
// cujo nome começa com o termo buscado, 3) ordem alfabética. Limita a 30
// resultados pra manter a lista curta e rápida de navegar.
const cidadesFiltradas = computed(() => {
  const busca = normalizarTexto(buscaCidade.value)
  if (busca.length < 2) return []

  const encontrados = municipios.value.filter((m) => normalizarTexto(m.nome).includes(busca))

  encontrados.sort((a, b) => {
    if (form.uf) {
      const aMesmaUf = a.uf === form.uf
      const bMesmaUf = b.uf === form.uf
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

// ao selecionar uma cidade da lista (clique ou teclado), preenche cidade E
// UF juntas a partir do mesmo registro do IBGE — é o que garante que
// "Dourados" sempre puxe automaticamente "MS".
function selecionarCidade(municipio) {
  form.cidade = municipio.nome.slice(0, CIDADE_MAX)
  form.uf = municipio.uf
  cidadeAberta.value = false
  buscaCidade.value = ''
}

function selecionarUf(sigla) {
  const ufAnterior = form.uf
  ufModel.value = sigla
  ufAberto.value = false

  // troca manual de UF: a cidade selecionada anteriormente pode não
  // pertencer ao novo estado, então limpamos pra evitar inconsistência.
  if (sigla !== ufAnterior) {
    form.cidade = ''
  }
}

const documentoBadge = computed(() => {
  if (!documento.raw.value) {
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

// assim que o documento vira CNPJ (mais de 11 dígitos), força o tipo pra jurídica.
watch(documentoEhCNPJ, (ehCnpj) => {
  if (ehCnpj) form.type = 'company'
})

// assim que o documento fecha um CPF (11 dígitos), força o tipo pra física —
// exceto se a categoria já for Fornecedor, que é sempre pessoa jurídica.
watch(documentoEhCPF, (ehCpf) => {
  if (ehCpf && !categoriaEhFornecedor.value) form.type = 'individual'
})

// Fornecedor é sempre pessoa jurídica: ao selecionar essa categoria,
// trava o tipo automaticamente. Isso vale tanto pra quando o usuário troca
// manualmente o Select quanto para quando `categoriaPadrao` já inicia o
// formulário como 'supplier' (ver preencherFormulario).
watch(
  () => form.categoria,
  (categoria) => {
    if (categoria === 'supplier') form.type = 'company'
  },
)

// trava "dura": além do Select ficar desabilitado (ver template), qualquer
// tentativa de mudar form.type enquanto algo já define o tipo é revertida na
// hora. Também é aqui que limpamos os campos exclusivos do tipo anterior,
// pra nunca enviar dado de PF numa PJ (ou vice-versa).
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
      form.genero = 'other'
      form.nascimento = ''
      delete erros.nascimento
    } else {
      form.nomeFantasia = ''
      form.inscricaoEstadual = ''
      form.pessoaContato = ''
      delete erros.nomeFantasia
      delete erros.inscricaoEstadual
      delete erros.pessoaContato
    }
  },
)

// 🟢 auto-preenchimento: assim que a consulta de CPF/CNPJ encontra um
// registro (documentoApi.status === 'found'), preenche automaticamente
// nome (e, se for CPF, nascimento/gênero).
//
// A API devolve o gênero como uma letra única ("M" / "F"), então aceitamos
// tanto a letra quanto a palavra por extenso.
watch(
  () => documentoApi.status,
  (status) => {
    if (status !== 'found') return

    if (documentoApi.nome) {
      form.nome = documentoApi.nome.slice(0, NOME_MAX)
    }
    if (documentoApi.tipo === 'CPF' && ehPessoaFisica.value) {
      if (documentoApi.nascimento) {
        form.nascimento = paraDataInput(documentoApi.nascimento)
      }
      if (documentoApi.genero) {
        const generoNormalizado = String(documentoApi.genero).toLowerCase()
        if (generoNormalizado === 'male' || generoNormalizado === 'm') {
          form.genero = 'male'
        } else if (generoNormalizado === 'female' || generoNormalizado === 'f') {
          form.genero = 'female'
        }
      }
    }
    if (documentoApi.tipo === 'CNPJ' && ehPessoaJuridica.value) {
      if (documentoApi.fantasia) {
        form.nomeFantasia = documentoApi.fantasia.slice(0, NOME_FANTASIA_MAX)
      }
      if (documentoApi.cidade) {
        form.cidade = documentoApi.cidade.slice(0, CIDADE_MAX)
      }
      if (documentoApi.uf) {
        form.uf = String(documentoApi.uf).toUpperCase().slice(0, 2)
      }
    }
  },
)

// 🟢 autofill de endereço via ViaCEP assim que o CEP atinge 8 dígitos
watch(cep.raw, async (valor) => {
  if (valor.length !== 8) return

  buscandoCep.value = true
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${valor}/json/`)
    const dados = await resposta.json()

    if (dados.erro) return

    form.logradouro = (dados.logradouro ?? '').slice(0, LOGRADOURO_MAX)
    form.bairro = (dados.bairro ?? '').slice(0, BAIRRO_MAX)
    form.cidade = (dados.localidade ?? '').slice(0, CIDADE_MAX)
    form.uf = (dados.uf ?? '').toUpperCase().slice(0, 2)
  } catch {
    // silencioso: autofill é um bônus de UX, não bloqueia o cadastro
  } finally {
    buscandoCep.value = false
  }
})

// remove erros assim que o usuário corrige os respectivos campos
watch(
  () => form.nascimento,
  (valor) => {
    if (erros.nascimento && (!valor || valor <= hoje)) delete erros.nascimento
  },
)
watch(
  () => email.value,
  (valor) => {
    if (erros.email && (!valor || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor))) delete erros.email
  },
)
watch(
  () => documento.raw.value,
  (valor) => {
    if (erros.documento && (!valor || SOMENTE_DIGITOS.test(valor))) delete erros.documento
  },
)
watch(
  () => telefone.raw.value,
  (valor) => {
    if (erros.telefone && (!valor || SOMENTE_DIGITOS.test(valor))) delete erros.telefone
  },
)
watch(
  () => cep.raw.value,
  (valor) => {
    if (erros.cep && (!valor || SOMENTE_DIGITOS.test(valor))) delete erros.cep
  },
)
watch(
  () => form.nome,
  (valor) => {
    if (erros.nome && valor.trim().length >= 3) delete erros.nome
  },
)
watch(
  () => form.type,
  () => {
    if (erros.type) delete erros.type
  },
)

// popula o formulário com os dados da pessoa (modo edição) ou zera tudo (modo criação)
function preencherFormulario() {
  const p = props.pessoa

  if (p) {
    form.categoria = p.categoria ?? 'client'
    form.type = p.type ?? 'individual'
    form.nome = p.nome ?? ''
    form.nomeFantasia = p.nomeFantasia ?? ''
    form.inscricaoEstadual = p.inscricaoEstadual ?? ''
    form.pessoaContato = p.pessoaContato ?? ''
    form.genero = p.genero ?? 'other'
    form.nascimento = paraDataInput(p.nascimento)
    form.logradouro = p.logradouro ?? ''
    form.numero = p.numero ?? ''
    form.complemento = p.complemento ?? ''
    form.bairro = p.bairro ?? ''
    form.cidade = p.cidade ?? ''
    form.uf = p.uf ?? ''
    form.ativo = p.status ? p.status === 'ativo' : (p.ativo ?? true)
    documento.setValue(p.documento ?? '')
    telefone.setValue(p.telefone ?? '')
    cep.setValue(p.cep ?? '')
    email.value = p.email ?? ''
  } else {
    // 🟢 NOVO: no modo criação, usa `categoriaPadrao` se ela foi passada
    // (ex.: modal de fornecedor abre direto com categoria = 'supplier',
    // o que já dispara o watch acima e trava o tipo em "jurídica").
    form.categoria = props.categoriaPadrao ?? 'client'
    form.type = 'individual'
    form.nome = ''
    form.nomeFantasia = ''
    form.inscricaoEstadual = ''
    form.pessoaContato = ''
    form.genero = 'other'
    form.nascimento = ''
    form.logradouro = ''
    form.numero = ''
    form.complemento = ''
    form.bairro = ''
    form.cidade = ''
    form.uf = ''
    form.ativo = true
    documento.setValue('')
    telefone.setValue('')
    cep.setValue('')
    email.value = ''
  }

  email.status = 'idle'
  buscaCidade.value = ''
  Object.keys(erros).forEach((chave) => delete erros[chave])

  // captura o snapshot DEPOIS de preencher — é a "foto" do estado original pro diff
  snapshot = p
    ? {
        categoria: form.categoria,
        type: form.type,
        nome: form.nome,
        documento: documento.raw.value,
        nomeFantasia: form.nomeFantasia,
        inscricaoEstadual: form.inscricaoEstadual,
        pessoaContato: form.pessoaContato,
        genero: form.genero,
        nascimento: form.nascimento,
        telefone: telefone.raw.value,
        email: email.value,
        cep: cep.raw.value,
        logradouro: form.logradouro,
        numero: form.numero,
        complemento: form.complemento,
        bairro: form.bairro,
        cidade: form.cidade,
        uf: form.uf,
        ativo: form.ativo,
      }
    : null
}

function fechar() {
  emit('update:open', false)
}

function montarPayload() {
  return {
    categoria: form.categoria,
    type: form.type,
    nome: form.nome,
    documento: documento.raw.value,
    nomeFantasia: ehPessoaJuridica.value ? form.nomeFantasia : '',
    inscricaoEstadual: ehPessoaJuridica.value ? form.inscricaoEstadual : '',
    pessoaContato: ehPessoaJuridica.value ? form.pessoaContato : '',
    genero: ehPessoaFisica.value ? form.genero : null,
    nascimento: ehPessoaFisica.value ? form.nascimento : null,
    telefone: telefone.raw.value,
    email: email.value,
    cep: cep.raw.value,
    logradouro: form.logradouro,
    numero: form.numero,
    complemento: form.complemento,
    bairro: form.bairro,
    cidade: form.cidade,
    uf: form.uf,
    ativo: form.ativo,
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

  // documento: obrigatório numérico — só dígitos, sem letras ou símbolos soltos
  if (!documento.raw.value) {
    erros.documento = 'Informe o CPF ou CNPJ.'
  } else if (!SOMENTE_DIGITOS.test(documento.raw.value)) {
    erros.documento = 'Documento deve conter apenas números.'
  } else if (!documento.isValid.value) {
    erros.documento = `${documento.tipo.value} inválido.`
  }

  // telefone: opcional, mas se preenchido precisa ser só dígitos
  if (telefone.raw.value && !SOMENTE_DIGITOS.test(telefone.raw.value)) {
    erros.telefone = 'Telefone deve conter apenas números.'
  }

  // cep: opcional, mas se preenchido precisa ser só dígitos
  if (cep.raw.value && !SOMENTE_DIGITOS.test(cep.raw.value)) {
    erros.cep = 'CEP deve conter apenas números.'
  }

  // ninguém nasce no futuro — bloqueio de segurança além do `max` do input
  if (form.nascimento && form.nascimento > hoje) {
    erros.nascimento = 'Data de nascimento não pode ser no futuro.'
  }

  // e-mail: opcional, mas se preenchido precisa ser válido
  if (email.value.trim() && email.status === 'invalid') {
    erros.email = 'Informe um e-mail válido.'
  }

  if (Object.keys(erros).length > 0) {
    return null
  }

  return resultado.data ?? payload
}

// mapa front -> API. Usado tanto pra montar o payload completo (criação e
// fallback de atualização completa) quanto pra montar o diff (PATCH).
// 🔴 CORRIGIDO: faltavam 'documento' e 'cep', então esses dois campos nunca
// chegavam traduzidos pro backend (por isso o Laravel reclamava de
// "name"/"document" mesmo com os campos preenchidos no formulário — o
// payload enviado tinha 'nome'/'documento', que a API não reconhece).
const CAMPO_PARA_API = {
  categoria: 'category',
  type: 'type',
  nome: 'name',
  documento: 'document',
  nomeFantasia: 'trade_name',
  inscricaoEstadual: 'state_registration',
  pessoaContato: 'contact_person',
  telefone: 'phone',
  email: 'email',
  genero: 'gender',
  nascimento: 'birth_date',
  cep: 'zip_code',
  logradouro: 'street',
  numero: 'number',
  complemento: 'complement',
  bairro: 'neighborhood',
  cidade: 'city',
  uf: 'state',
  ativo: 'active',
}

// 🟢 NOVO: traduz o payload inteiro (formato front, em português) pro
// formato que a API espera (em inglês). Usado na criação e no fallback de
// atualização completa — antes esses dois fluxos enviavam o payload cru,
// com as chaves em português, e a API não reconhecia nenhum campo.
function converterParaApi(payloadFront) {
  const payloadApi = {}
  for (const [campoFront, valor] of Object.entries(payloadFront)) {
    const campoApi = CAMPO_PARA_API[campoFront]
    if (campoApi) {
      payloadApi[campoApi] = valor
    }
  }
  return payloadApi
}

// compara o payload atual (formato front) com o snapshot e devolve só o que mudou,
// já convertido pro formato da API (ex.: 'nome' -> 'name')
function calcularDiff(payloadAtual) {
  const diff = {}

  for (const [campoFront, valorAtual] of Object.entries(payloadAtual)) {
    const valorOriginal = snapshot ? snapshot[campoFront] : undefined
    if (valorAtual !== valorOriginal) {
      const campoApi = CAMPO_PARA_API[campoFront]
      if (campoApi) {
        diff[campoApi] = valorAtual
      }
    }
  }

  return diff
}

// Mapeia erros de validação vindos do Laravel (em inglês) de volta pros campos do form (português)
const MAPA_CAMPOS_API = {
  category: 'categoria',
  type: 'type',
  name: 'nome',
  document: 'documento',
  trade_name: 'nomeFantasia',
  state_registration: 'inscricaoEstadual',
  contact_person: 'pessoaContato',
  phone: 'telefone',
  email: 'email',
  gender: 'genero',
  birth_date: 'nascimento',
  zip_code: 'cep',
  street: 'logradouro',
  number: 'numero',
  complement: 'complemento',
  neighborhood: 'bairro',
  city: 'cidade',
  state: 'uf',
  active: 'ativo',
}

function aplicarErrosDaApi(e) {
  const apiErrors = e.response?.data?.errors
  const message = e.response?.data?.message ?? ''

  if (apiErrors) {
    Object.entries(apiErrors).forEach(([campo, mensagens]) => {
      const chave = MAPA_CAMPOS_API[campo] || campo
      const mensagemOriginal = Array.isArray(mensagens) ? mensagens[0] : mensagens

      // 🟢 Tratamento para erro de CPF/CNPJ duplicado
      if (campo === 'document' || chave === 'documento') {
        const textoErro = String(mensagemOriginal).toLowerCase()

        if (
          textoErro.includes('taken') ||
          textoErro.includes('already been taken') ||
          textoErro.includes('ja existe') ||
          textoErro.includes('já existe') ||
          textoErro.includes('unique')
        ) {
          erros.documento = 'Já existe um cliente ou fornecedor cadastrado com este CPF/CNPJ.'
          return
        }
      }

      erros[chave] = mensagemOriginal
    })

    erro('Confira os campos destacados antes de salvar.')
  } else {
    // 🟢 Trata caso o backend retorne o erro na raiz da resposta 'message' em vez de 'errors'
    const msgBaixa = String(message).toLowerCase()
    if (
      msgBaixa.includes('taken') ||
      msgBaixa.includes('already been taken') ||
      msgBaixa.includes('ja existe') ||
      msgBaixa.includes('já existe')
    ) {
      erros.documento = 'Já existe um cliente ou fornecedor cadastrado com este CPF/CNPJ.'
      erro('Já existe um registro com este CPF/CNPJ.')
    } else {
      erro(message || 'Não foi possível salvar. Tente novamente.')
    }
  }
}

async function salvar() {
  if (salvando.value) return

  const payload = validar()
  if (!payload) {
    erro('Confira os campos destacados antes de salvar.')
    return
  }

  salvando.value = true
  try {
    if (modoEdicao.value) {
      const diff = calcularDiff(payload)

      if (Object.keys(diff).length === 0) {
        fechar()
        return
      }

      // 🔴 CORRIGIDO: fallback de atualização completa também precisa
      // enviar o payload traduzido, não o payload cru em português.
      const pessoaSalva = props.aoAtualizarParcial
        ? await props.aoAtualizarParcial(props.pessoa.id, diff)
        : await props.aoAtualizar(props.pessoa.id, converterParaApi(payload))

      emit('updated', pessoaSalva)
    } else {
      // 🔴 CORRIGIDO: era `props.aoCriar(payload)`, enviando 'nome'/'documento'
      // em vez de 'name'/'document' — por isso o Laravel dizia que os dois
      // campos eram obrigatórios mesmo estando preenchidos no formulário.
      const pessoaSalva = await props.aoCriar(converterParaApi(payload))
      emit('created', pessoaSalva)
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
        <!-- Linha 1: Categoria, Tipo, Documento e Nome — tudo numa única faixa -->
        <section class="space-y-2">
          <h3 class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Identificação
          </h3>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-12">
            <div class="col-span-1 lg:col-span-2">
              <label for="categoria" class="mb-1 block text-xs font-medium text-foreground">
                Categoria <span class="text-destructive">*</span>
              </label>
              <Select v-model="form.categoria" :disabled="categoriaFixa">
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
                  {{ documentoBadge.texto }} </span
                ><span class="text-destructive">*</span>
              </label>
              <input
                id="documento"
                :value="documento.formatted.value"
                :maxlength="18"
                inputmode="numeric"
                placeholder="000.000.000-00"
                class="h-9 w-full cursor-text rounded-md border border-input bg-transparent px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
                :aria-invalid="!!erros.documento"
                @input="documento.onInput"
              />
              <p v-if="erros.documento" class="mt-0.5 text-[10px] text-destructive">
                {{ erros.documento }}
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
                  v-model="form.nome"
                  :placeholder="
                    ehPessoaJuridica ? 'Ex.: Comércio Boa Vista Ltda' : 'Ex.: Ana Beatriz Souza'
                  "
                  :maxlength="NOME_MAX"
                  class="h-9 cursor-text pr-12 text-xs"
                  :aria-invalid="!!erros.nome"
                />
                <span
                  class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 select-none text-[10px] font-medium tabular-nums transition-colors"
                  :class="
                    form.nome.length >= NOME_MAX ? 'text-red-500' : 'text-muted-foreground/40'
                  "
                >
                  {{ form.nome.length }}/{{ NOME_MAX }}
                </span>
              </div>
              <p v-if="erros.nome" class="mt-0.5 text-[10px] text-destructive">{{ erros.nome }}</p>
            </div>
          </div>
        </section>

        <!-- Linha 2: Dados de PJ e PF lado a lado (só um lado fica ativo por vez) -->
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
                  v-model="nomeFantasiaModel"
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
                  v-model="inscricaoEstadualModel"
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
                  v-model="pessoaContatoModel"
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
                <Select v-model="form.genero" :disabled="!ehPessoaFisica">
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
                  v-model="form.nascimento"
                  type="date"
                  :max="hoje"
                  :disabled="!ehPessoaFisica"
                  class="h-9 cursor-text text-xs"
                  :aria-invalid="!!erros.nascimento"
                />
                <p v-if="erros.nascimento" class="mt-0.5 text-[10px] text-destructive">
                  {{ erros.nascimento }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- Linha 3: Contato -->
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
                :aria-invalid="!!erros.telefone"
                @input="telefone.onInput"
              />
              <p v-if="erros.telefone" class="mt-0.5 text-[10px] text-destructive">
                {{ erros.telefone }}
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

        <!-- Linha 4: Endereço — em 2 fileiras, mais larga que comprida -->
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
                  :aria-invalid="!!erros.cep"
                  @input="cep.onInput"
                />
                <Loader2
                  v-if="buscandoCep"
                  class="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground"
                />
              </div>
              <p v-if="erros.cep" class="mt-0.5 text-[10px] text-destructive">{{ erros.cep }}</p>
            </div>

            <div class="col-span-2 sm:col-span-4 lg:col-span-6">
              <label for="logradouro" class="mb-1 block text-xs font-medium text-foreground">
                Logradouro
              </label>
              <Input
                id="logradouro"
                v-model="logradouroModel"
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
                v-model="numeroModel"
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
                    :aria-invalid="!!erros.uf"
                  >
                    <span :class="!form.uf ? 'text-muted-foreground' : ''">
                      {{ form.uf ? `${form.uf} — ${ufSelecionada?.nome ?? ''}` : 'Selecione a UF' }}
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
                                form.uf === uf.sigla ? 'opacity-100' : 'opacity-0',
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
              <p v-if="erros.uf" class="mt-0.5 text-[10px] text-destructive">{{ erros.uf }}</p>
            </div>

            <div class="col-span-2 sm:col-span-3 lg:col-span-4">
              <label for="complemento" class="mb-1 block text-xs font-medium text-foreground">
                Complemento
              </label>
              <Input
                id="complemento"
                v-model="complementoModel"
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
                v-model="bairroModel"
                placeholder="Ex.: Centro"
                :maxlength="BAIRRO_MAX"
                class="h-9 cursor-text text-xs"
              />
            </div>

            <!-- 🟢 NOVO: combobox de Cidade — mesmo padrão do combobox de UF acima
                 (Popover + Command), mas com lista nacional de municípios vinda do
                 IBGE. Selecionar uma cidade preenche a UF automaticamente. -->
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
                      <span :class="!form.cidade ? 'text-muted-foreground' : ''" class="truncate">
                        {{ form.cidade || 'Selecione a cidade' }}
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
                                  form.cidade === cidade.nome && form.uf === cidade.uf
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
                  v-model="cidadeModel"
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

        <!-- Situação: barra compacta, uma única linha -->
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
            v-model="form.ativo"
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
