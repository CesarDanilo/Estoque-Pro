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

  // 🔴 CORRIGIDO: as métricas dos cards (Faturamento, Aguardando pagamento,
  // Ticket médio) NÃO podem ser calculadas em cima de `vendas.value`, porque
  // esse array é só a PÁGINA atual (ex.: 8 de 30 vendas). Calculando aqui,
  // os cards mostravam números da página exibida, não do total filtrado.
  //
  // Agora eles vêm prontos do backend, no bloco `summary` que o
  // SaleController calcula sobre a query INTEIRA (já com os filtros
  // aplicados), antes de paginar — então ficam corretos independente de
  // quantas páginas existirem ou em qual página o usuário está.
  const summary = computed(() => salesQuery.data.value?.summary ?? null)

  const totalVendido = computed(() => Number(summary.value?.faturamento_concluido ?? 0))

  const aguardandoPagamento = computed(() => Number(summary.value?.aguardando_pagamento ?? 0))

  const ticketMedio = computed(() => Number(summary.value?.ticket_medio ?? 0))

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

    // Métricas (calculadas no backend sobre o total filtrado, não a página)
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
