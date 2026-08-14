import { ref, reactive } from 'vue'
import api from '@/services/api'

export function usePeople() {
  const pessoas = ref([])
  const carregando = ref(false)
  const erro = ref(null)

  const meta = reactive({
    paginaAtual: 1,
    totalPaginas: 1,
    total: 0,
  })

  async function buscar({ search = '', type = 'todos', active = 'todos', page = 1 } = {}) {
    carregando.value = true
    erro.value = null

    try {
      const params = { page, per_page: 8 }
      if (search) params.search = search
      if (type !== 'todos') params.type = type
      if (active !== 'todos') params.active = active === 'ativo' ? 1 : 0

      const { data } = await api.get('/person', { params })

      const lista = data.data || data
      pessoas.value = Array.isArray(lista) ? lista.map(personFromApi) : []

      meta.paginaAtual = data.current_page || 1
      meta.totalPaginas = data.last_page || 1
      meta.total = data.total || pessoas.value.length
    } catch (e) {
      erro.value = e.response?.data?.message || 'Erro ao carregar pessoas.'
    } finally {
      carregando.value = false
    }
  }

  async function criar(pessoa) {
    const payload = personToApi(pessoa)
    const { data } = await api.post('/person', payload)
    const pessoaCriada = data.person || data.data || data
    return personFromApi(pessoaCriada)
  }

  async function atualizar(id, pessoa) {
    const payload = personToApi(pessoa)
    const { data } = await api.put(`/person/${id}`, payload)
    const pessoaAtualizada = personFromApi(data.person || data.data || data)

    const index = pessoas.value.findIndex((p) => p.id === id)
    if (index !== -1) {
      pessoas.value[index] = pessoaAtualizada
    }

    return pessoaAtualizada
  }

  async function atualizarParcial(id, camposParciais) {
    const { data } = await api.patch(`/person/${id}`, camposParciais)
    const pessoaAtualizada = personFromApi(data.person || data.data || data)

    const index = pessoas.value.findIndex((p) => p.id === id)
    if (index !== -1) {
      pessoas.value[index] = { ...pessoas.value[index], ...pessoaAtualizada }
    }

    return pessoaAtualizada
  }

  async function alternarAtivo(id, ativo) {
    return atualizarParcial(id, { active: ativo })
  }

  async function remover(id) {
    await api.delete(`/person/${id}`)
    pessoas.value = pessoas.value.filter((p) => p.id !== id)
  }

  return {
    pessoas,
    carregando,
    erro,
    meta,
    buscar,
    criar,
    atualizar,
    atualizarParcial,
    alternarAtivo,
    remover,
  }
}

/**
 * Converte e sanitiza o objeto do formulário para o payload esperado pela API.
 */
export function personToApi(pessoa) {
  if (!pessoa) return {}

  const category = pessoa.category || pessoa.categoria || null
  const type = pessoa.type || null
  const name = pessoa.name || pessoa.nome || null

  const rawDoc =
    typeof pessoa.document === 'object' && pessoa.document !== null
      ? pessoa.document.value
      : pessoa.document || pessoa.documento

  const documentoLimpo = String(rawDoc || '').replace(/\D/g, '')
  const telefoneLimpo = String(pessoa.phone || pessoa.telefone || '').replace(/\D/g, '')
  const cepLimpo = String(pessoa.zip_code || pessoa.cep || '').replace(/\D/g, '')

  const ehPessoaFisica = type === 'individual'

  return {
    category,
    type,
    name,
    document: documentoLimpo || null,

    trade_name: ehPessoaFisica ? null : pessoa.trade_name || pessoa.nomeFantasia || null,
    state_registration: ehPessoaFisica
      ? null
      : pessoa.state_registration || pessoa.inscricaoEstadual || null,
    contact_person: ehPessoaFisica ? null : pessoa.contact_person || pessoa.pessoaContato || null,

    gender: ehPessoaFisica ? pessoa.gender || pessoa.genero || null : null,
    birth_date: ehPessoaFisica ? pessoa.birth_date || pessoa.nascimento || null : null,

    phone: telefoneLimpo || null,
    email: pessoa.email || null,

    zip_code: cepLimpo || null,
    street: pessoa.street || pessoa.logradouro || null,
    number: pessoa.number || pessoa.numero || null,
    complement: pessoa.complement || pessoa.complemento || null,
    neighborhood: pessoa.neighborhood || pessoa.bairro || null,
    city: pessoa.city || pessoa.cidade || null,
    state: pessoa.state || pessoa.uf || null,

    active: Boolean(pessoa.active ?? pessoa.ativo ?? true),
  }
}

/**
 * Normaliza a resposta da API para o formato esperado pelo frontend.
 */
export function personFromApi(p) {
  if (!p) return {}

  const active = Boolean(p.active ?? p.ativo)
  const rawDate = p.created_at || p.cadastro || ''
  const formattedDate = rawDate ? rawDate.slice(0, 10) : ''

  return {
    id: p.id,

    category: p.category || 'client',
    type: p.type || 'individual',
    name: p.name || '',
    document: p.document || p.cnpj || p.cpf || '',

    trade_name: p.trade_name || '',
    state_registration: p.state_registration || '',
    contact_person: p.contact_person || '',

    gender: p.gender || '',
    birth_date: p.birth_date || '',

    phone: p.phone || '',
    email: p.email || '',

    zip_code: p.zip_code || '',
    street: p.street || '',
    number: p.number || '',
    complement: p.complement || '',
    neighborhood: p.neighborhood || '',
    city: p.city || '',
    state: p.state || '',

    active,
    created_at: formattedDate,

    // Aliases para a tabela
    categoria: p.category || 'client',
    nome: p.name || '',
    documento: p.document || p.cnpj || p.cpf || '',
    nomeFantasia: p.trade_name || '',
    inscricaoEstadual: p.state_registration || '',
    pessoaContato: p.contact_person || '',
    genero: p.gender || '',
    nascimento: p.birth_date || '',
    telefone: p.phone || '',
    cep: p.zip_code || '',
    logradouro: p.street || '',
    numero: p.number || '',
    complemento: p.complement || '',
    bairro: p.neighborhood || '',
    cidade: p.city || '',
    uf: p.state || '',
    ativo: active,
    status: active ? 'ativo' : 'inativo',
    cadastro: formattedDate,
  }
}
