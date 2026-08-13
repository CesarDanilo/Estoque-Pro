import { useQuery, useQueryClient } from '@tanstack/vue-query'
import api from '@/services/api' // Importação padrão (compatível com export default)

export function useDashboard() {
  const queryClient = useQueryClient()

  // 1. Resumo Métricas (Cards)
  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      try {
        const res = await api.get('/dashboard/summary')
        return res.data
      } catch (err) {
        console.error('Erro ao buscar resumo:', err)
        return null
      }
    },
    staleTime: 1000 * 60 * 5,
  })

  // 2. Mais Vendidos (Últimos 30 dias)
  const topProductsQuery = useQuery({
    queryKey: ['dashboard', 'top-products'],
    queryFn: async () => {
      try {
        const res = await api.get('/dashboard/top-products?days=30&limit=5')
        return res.data
      } catch (err) {
        console.error('Erro ao buscar produtos mais vendidos:', err)
        return []
      }
    },
    staleTime: 1000 * 60 * 10,
  })

  // 3. Vendas por Grupo (Gráfico de Barras)
  const salesByGroupQuery = useQuery({
    queryKey: ['dashboard', 'sales-by-group'],
    queryFn: async () => {
      try {
        const res = await api.get('/dashboard/sales-by-group?days=30')
        return res.data
      } catch (err) {
        console.error('Erro ao buscar vendas por grupo:', err)
        return []
      }
    },
    staleTime: 1000 * 60 * 10,
  })

  // 4. Vendas Diárias (Gráfico de Linhas)
  const dailySalesQuery = useQuery({
    queryKey: ['dashboard', 'daily-sales'],
    queryFn: async () => {
      try {
        const res = await api.get('/dashboard/daily-sales?days=15')
        return res.data
      } catch (err) {
        console.error('Erro ao buscar vendas diárias:', err)
        return []
      }
    },
    staleTime: 1000 * 60 * 5,
  })

  // 5. Produtos sem Vendas nos Últimos 30 dias
  const withoutSalesQuery = useQuery({
    queryKey: ['dashboard', 'without-sales'],
    queryFn: async () => {
      try {
        const res = await api.get('/dashboard/without-sales?days=30')
        return res.data
      } catch (err) {
        console.error('Erro ao buscar produtos sem vendas:', err)
        return []
      }
    },
    staleTime: 1000 * 60 * 10,
  })

  // 6. Produtos em Estoque Baixo / Crítico
  const lowStockQuery = useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: async () => {
      try {
        const res = await api.get('/products?status=low_stock')
        return res.data?.data || res.data || []
      } catch (err) {
        console.error('Erro ao buscar estoque baixo:', err)
        return []
      }
    },
    staleTime: 1000 * 60 * 5,
  })

  // 7. Lista de Vendas Recentes (Atividades)
  const recentSalesQuery = useQuery({
    queryKey: ['sales', 'recent'],
    queryFn: async () => {
      try {
        const res = await api.get('/sales?per_page=5')
        return res.data?.data || []
      } catch (err) {
        console.error('Erro ao buscar vendas recentes:', err)
        return []
      }
    },
    staleTime: 1000 * 60 * 2,
  })

  // Revalidação global dos dados do Dashboard
  async function revalidarDashboard() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['products'] }),
      queryClient.invalidateQueries({ queryKey: ['sales'] }),
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
