import { useQuery, useQueryClient } from '@tanstack/vue-query'
import api from '@/services/api'

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

  const lowStockQuery = useQuery({
    queryKey: ['dashboard', 'low-stock'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/low-stock', {
        params: { limit: 50 },
      })
      return data
    },
  })

  const recentSalesQuery = useQuery({
    queryKey: ['dashboard', 'recent-activities'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/dashboard/recent-activities', {
          params: { limit: 10 },
        })
        return Array.isArray(data) ? data : (data?.data ?? [])
      } catch (err) {
        console.error('Erro ao buscar atividades recentes:', err)
        return []
      }
    },
  })

  async function revalidarDashboard() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'top-products'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'sales-by-group'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'daily-sales'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'without-sales'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'low-stock'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'recent-activities'] }),
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
