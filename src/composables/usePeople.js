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

  async function atualizar(id, pessoa) {
    const { data } = await api.put(`/person/${id}`, personToApi(pessoa))
    return personFromApi(data.person)
  }

  async function remover(id) {
    await api.delete(`/person/${id}`)
  }

  return { pessoas, carregando, erro, meta, buscar, criar, atualizar, remover }
}