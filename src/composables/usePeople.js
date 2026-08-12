import { ref, reactive } from 'vue'
import api from '@/services/api'
import { personFromApi, personToApi } from '@/lib/personMapper'

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

      pessoas.value = data.data.map(personFromApi)
      meta.paginaAtual = data.current_page
      meta.totalPaginas = data.last_page
      meta.total = data.total
    } catch (e) {
      erro.value = e.response?.data?.message || 'Erro ao carregar pessoas.'
    } finally {
      carregando.value = false
    }
  }

  async function criar(pessoa) {
    const { data } = await api.post('/person', personToApi(pessoa))
    return personFromApi(data.person)
  }

  // update completo (usado pelo modal de edição) — manda todos os campos via PUT
  async function atualizar(id, pessoa) {
    const { data } = await api.put(`/person/${id}`, personToApi(pessoa))
    return personFromApi(data.person)
  }

  // update parcial — manda só os campos alterados via PATCH.
  // `camposParciais` já deve estar no formato da API (ex: { active: false }).
  // Depende do backend aceitar 'sometimes' nas regras de validação do update.
  async function atualizarParcial(id, camposParciais) {
    const { data } = await api.patch(`/person/${id}`, camposParciais)
    const pessoaAtualizada = personFromApi(data.person)

    // reflete a mudança na lista local sem precisar recarregar tudo
    const index = pessoas.value.findIndex((p) => p.id === id)
    if (index !== -1) {
      pessoas.value[index] = { ...pessoas.value[index], ...pessoaAtualizada }
    }

    return pessoaAtualizada
  }

  // helper pronto pra um switch/toggle de ativo direto na tabela
  async function alternarAtivo(id, ativo) {
    return atualizarParcial(id, { active: ativo })
  }

  async function remover(id) {
    await api.delete(`/person/${id}`)
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
