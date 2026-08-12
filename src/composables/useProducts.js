import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, unref } from 'vue'
import api from '@/services/api' // ou import axios de '@/lib/axios'

export function useProducts(filters = {}) {
  const queryClient = useQueryClient()

  // 1. QUERY DE LISTAGEM DE PRODUTOS
  const productsQuery = useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      // Extrai os valores das refs caso os filtros sejam reativos
      const params = {
        search: unref(filters.search) || undefined,
        status: unref(filters.status) || undefined,
        category: unref(filters.category) || undefined,
        page: unref(filters.page) || 1,
        per_page: unref(filters.perPage) || 10,
      }

      const { data } = await api.get('/products', { params })
      return data
    },
  })

  // 2. MUTATION: CRIAR PRODUTO
  const createMutation = useMutation({
    mutationFn: async (novoProduto) => {
      const { data } = await api.post('/products', novoProduto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  // 3. MUTATION: ATUALIZAR PRODUTO
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/products/${id}`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  // 4. MUTATION: REMOVER PRODUTO
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/products/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  return {
    // Dados e estados
    produtos: computed(() => productsQuery.data.value?.data ?? productsQuery.data.value ?? []),
    meta: computed(() => ({
      paginaAtual: productsQuery.data.value?.current_page ?? 1,
      totalPaginas: productsQuery.data.value?.last_page ?? 1,
      total: productsQuery.data.value?.total ?? 0,
    })),
    carregando: productsQuery.isLoading,
    erro: productsQuery.error,
    refetch: productsQuery.refetch,

    // Ações de escrita
    criar: createMutation.mutateAsync,
    criando: createMutation.isPending,

    atualizar: updateMutation.mutateAsync,
    atualizando: updateMutation.isPending,

    remover: deleteMutation.mutateAsync,
    removendo: deleteMutation.isPending,
  }
}
