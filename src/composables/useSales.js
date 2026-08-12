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
        status: rawFilters.status && rawFilters.status !== 'todos' ? rawFilters.status : undefined,
        payment_method:
          rawFilters.payment_method && rawFilters.payment_method !== 'todos'
            ? rawFilters.payment_method
            : undefined,
        start_date: rawFilters.start_date || undefined,
        end_date: rawFilters.end_date || undefined,
      })
    },
    keepPreviousData: true,
    staleTime: 1000 * 60 * 2, // 2 minutos em cache
  })

  // 2. Mutation: Criar Venda
  const createSaleMutation = useMutation({
    mutationFn: (saleData) => saleService.createSale(saleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  // 3. Mutation: Atualizar Venda / Status
  const updateSaleMutation = useMutation({
    mutationFn: ({ id, data }) => saleService.updateSale(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })

  // 4. Mutation: Excluir Venda (Soft Delete)
  const deleteSaleMutation = useMutation({
    mutationFn: (id) => saleService.deleteSale(id),
    onSuccess: () => {
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

  // 5. Busca de uma venda específica com os itens completos (usado na edição)
  // ATENÇÃO: assume que o backend expõe GET /sales/{id}. Se o seu saleService.js
  // usar outro nome/endpoint, ajuste a implementação de saleService.getSale.
  async function getSale(id) {
    return saleService.getSale(id)
  }

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

    // Busca de detalhes (para edição)
    getSale,

    // Mutations (Criar, Atualizar e Excluir)
    createSale: createSaleMutation.mutateAsync,
    isCreating: createSaleMutation.isPending,

    // updateSale(id, data) — sempre chamar com dois argumentos posicionais
    updateSaleStatus: (id, data) => updateSaleMutation.mutateAsync({ id, data }),
    updateSale: (id, data) => updateSaleMutation.mutateAsync({ id, data }),
    isUpdating: updateSaleMutation.isPending,

    deleteSale: (id) => deleteSaleMutation.mutateAsync(id),
    isDeleting: deleteSaleMutation.isPending,
  }
}
