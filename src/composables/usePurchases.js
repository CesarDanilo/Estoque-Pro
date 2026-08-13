import { computed, unref } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { purchaseService } from '@/services/purchaseService'

export function usePurchases(filters = {}) {
  const queryClient = useQueryClient()

  // 1. Query: Listagem de Compras com Cache
  const purchasesQuery = useQuery({
    queryKey: ['purchases', filters],
    queryFn: () => {
      const rawFilters = unref(filters)
      return purchaseService.getPurchases({
        page: rawFilters.page,
        per_page: rawFilters.per_page,
        search: rawFilters.search || undefined,
        status: rawFilters.status && rawFilters.status !== 'todos' ? rawFilters.status : undefined,
        supplier_id: rawFilters.supplier_id || undefined,
        start_date: rawFilters.start_date || undefined,
        end_date: rawFilters.end_date || undefined,
      })
    },
    keepPreviousData: true,
    staleTime: 1000 * 60 * 2, // 2 minutos em cache
  })

  // 2. Mutation: Criar Compra
  const createPurchaseMutation = useMutation({
    mutationFn: (data) => purchaseService.createPurchase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  // 3. Mutation: Atualizar Compra
  const updatePurchaseMutation = useMutation({
    mutationFn: ({ id, data }) => purchaseService.updatePurchase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  // 4. Mutation: Excluir/Cancelar Compra
  const deletePurchaseMutation = useMutation({
    mutationFn: (id) => purchaseService.deletePurchase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  // Computeds auxiliares extraídos do retorno paginado da API
  const compras = computed(() => purchasesQuery.data.value?.data ?? [])
  const totalPaginas = computed(() => purchasesQuery.data.value?.last_page ?? 1)
  const totalRegistros = computed(() => purchasesQuery.data.value?.total ?? 0)

  // Métricas calculadas
  const totalComprado = computed(() =>
    compras.value
      .filter((c) => c.status !== 'cancelled')
      .reduce((s, c) => s + Number(c.total || 0), 0),
  )

  const aguardandoRecebimento = computed(
    () => compras.value.filter((c) => c.status === 'pending').length,
  )

  // Busca de uma compra específica com os itens completos
  async function getPurchase(id) {
    return purchaseService.getPurchase(id)
  }

  return {
    // Estado do Query
    compras,
    totalPaginas,
    totalRegistros,
    isLoading: purchasesQuery.isLoading,
    isError: purchasesQuery.isError,
    refetch: purchasesQuery.refetch,

    // Métricas
    totalComprado,
    aguardandoRecebimento,

    // Busca de detalhes
    getPurchase,

    // Mutations
    createPurchase: createPurchaseMutation.mutateAsync,
    isCreating: createPurchaseMutation.isPending,

    updatePurchase: (id, data) => updatePurchaseMutation.mutateAsync({ id, data }),
    isUpdating: updatePurchaseMutation.isPending,

    deletePurchase: (id) => deletePurchaseMutation.mutateAsync(id),
    isDeleting: deletePurchaseMutation.isPending,
  }
}
