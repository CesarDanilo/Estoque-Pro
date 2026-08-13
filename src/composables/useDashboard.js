import { useQuery, useQueryClient } from '@tanstack/vue-query'
import api from '@/services/api' // ajuste para o caminho real do seu client axios/fetch

/**
 * Composable central do Dashboard.
 * Cada query bate em um endpoint do DashboardController (Laravel),
 * exceto `recentSalesQuery`, que reaproveita o endpoint de listagem
 * de vendas (GET /sales) já ordenado por mais recentes.
 */
export function useDashboard() {
  const queryClient = useQueryClient()

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/summary')
      return data
    },
  })

  const topProductsQuery = useQuery({
    queryKey: ['dashboard', 'top-products'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/top-products', {
        params: { days: 30, limit: 5 },
      })
      return data
    },
  })

  const salesByGroupQuery = useQuery({
    queryKey: ['dashboard', 'sales-by-group'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/sales-by-group', {
        params: { days: 30 },
      })
      return data
    },
  })

  const dailySalesQuery = useQuery({
    queryKey: ['dashboard', 'daily-sales'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/daily-sales', {
        params: { days: 15 },
      })
      return data
    },
  })

  const withoutSalesQuery = useQuery({
    queryKey: ['dashboard', 'without-sales'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/without-sales', {
        params: { days: 30 },
      })
      return data
    },
  })

  // 🔴 Card "Precisa da sua atenção" — produtos com estoque <= mínimo,
  // já ordenados do menor para o maior estoque restante pelo backend.
  const lowStockQuery = useQuery({
    queryKey: ['dashboard', 'low-stock'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/low-stock', {
        params: { limit: 50 },
      })
      return data
    },
  })

  // Reaproveita a listagem paginada de vendas (SaleController@index),
  // pedindo poucos itens já ordenados por mais recentes (->latest()).
  const recentSalesQuery = useQuery({
    queryKey: ['dashboard', 'recent-sales'],
    queryFn: async () => {
      const { data } = await api.get('/sales', {
        params: { per_page: 5 },
      })
      // SaleController::index retorna um paginator do Laravel,
      // então os registros vêm dentro de `data.data`.
      return data?.data ?? []
    },
  })

  /**
   * Revalida (refetch) todas as queries do dashboard de uma vez.
   * Chamado após salvar um produto ou registrar uma venda.
   */
  async function revalidarDashboard() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'top-products'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'sales-by-group'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'daily-sales'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'without-sales'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'low-stock'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'recent-sales'] }),
    ])
  }

  return {
    summaryQuery,
    topProductsQuery,
    salesByGroupQuery,
    dailySalesQuery,
    withoutSalesQuery,
    lowStockQuery,
    recentSalesQuery,
    revalidarDashboard,
  }
}
