import { computed, unref } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { saleService } from '@/services/saleService'

export function useSales(filters = {}) {
  const queryClient = useQueryClient()

  // 1. Query: Listagem de Vendas com Cache
  const salesQuery = useQuery({
    queryKey: ['sales', filters],
    queryFn: () => {
      const rawFilters = unref(filters)
      return saleService.getSales({
        page: rawFilters.page,
        per_page: rawFilters.per_page,
        search: rawFilters.search || undefined,
        status: rawFilters.status !== 'todos' ? rawFilters.status : undefined,
      })
    },
    keepPreviousData: true,
    staleTime: 1000 * 60 * 2, // 2 minutos em cache
  })

  // 2. Mutation: Criar Venda
  const createSaleMutation = useMutation({
    mutationFn: (saleData) => saleService.createSale(saleData),
    onSuccess: () => {
      // Invalida cache de vendas e de produtos (para refletir o estoque baixado)
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  // Computeds auxiliares extraídos do retorno da API
  const vendas = computed(() => salesQuery.data.value?.data ?? [])
  const totalPaginas = computed(() => salesQuery.data.value?.last_page ?? 1)
  const totalRegistros = computed(() => salesQuery.data.value?.total ?? 0)

  // Métricas calculadas
  const totalVendido = computed(() =>
    vendas.value
      .filter((v) => v.status !== 'cancelled')
      .reduce((s, v) => s + Number(v.total || 0), 0),
  )

  const aguardandoPagamento = computed(
    () => vendas.value.filter((v) => v.status === 'pending').length,
  )

  const ticketMedio = computed(() => {
    const concluidas = vendas.value.filter((v) => v.status !== 'cancelled').length
    return concluidas ? totalVendido.value / concluidas : 0
  })

  return {
    // Estado do Query
    vendas,
    totalPaginas,
    totalRegistros,
    isLoading: salesQuery.isLoading,
    isError: salesQuery.isError,
    refetch: salesQuery.refetch,

    // Métricas
    totalVendido,
    aguardandoPagamento,
    ticketMedio,

    // Mutation
    createSale: createSaleMutation.mutateAsync,
    isCreating: createSaleMutation.isPending,
  }
}
