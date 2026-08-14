import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, unref } from 'vue'
import api from '@/services/api' // ou import axios de '@/lib/axios'

function extrairArray(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

export function useProducts(filters = {}) {
  const queryClient = useQueryClient()

  // 1. QUERY DE LISTAGEM DE PRODUTOS
  const productsQuery = useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const params = {
        search: unref(filters.search) || undefined,
        status: unref(filters.status) || undefined,
        group_id: unref(filters.group) || undefined,
        page: unref(filters.page) || 1,
        per_page: unref(filters.perPage) || 10,
      }

      const { data } = await api.get('/products', { params })
      return data
    },
  })

  // 2. QUERY DE GRUPOS (para popular o filtro)
  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data } = await api.get('/groups')
      return data
    },
    staleTime: 1000 * 60 * 10,
  })

  // 3. MUTATION: CRIAR PRODUTO
  const createMutation = useMutation({
    mutationFn: async (novoProduto) => {
      const { data } = await api.post('/products', novoProduto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  // 4. MUTATION: ATUALIZAR PRODUTO
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/products/${id}`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  // 5. MUTATION: REMOVER PRODUTO
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/products/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  return {
    // Produtos
    produtos: computed(() => extrairArray(productsQuery.data.value)),
    meta: computed(() => ({
      paginaAtual: productsQuery.data.value?.current_page ?? 1,
      totalPaginas: productsQuery.data.value?.last_page ?? 1,
      total: productsQuery.data.value?.total ?? 0,
    })),
    carregando: productsQuery.isLoading,
    erro: productsQuery.error,
    refetch: productsQuery.refetch,

    // Grupos
    grupos: computed(() => extrairArray(groupsQuery.data.value)),
    carregandoGrupos: groupsQuery.isLoading,
    erroGrupos: groupsQuery.error,

    // Ações de escrita
    criar: createMutation.mutateAsync,
    criando: createMutation.isPending,

    atualizar: updateMutation.mutateAsync,
    atualizando: updateMutation.isPending,

    remover: deleteMutation.mutateAsync,
    removendo: deleteMutation.isPending,
  }
}
