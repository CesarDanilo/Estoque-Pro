import { useQuery } from '@tanstack/vue-query'
import api from '@/services/api'

// 1. Relatório de Vendas
export function useSalesReport(periodRef) {
  return useQuery({
    queryKey: ['reports', 'sales', periodRef],
    queryFn: async () => {
      const { data } = await api.get('/reports/sales', {
        params: { period: periodRef.value },
      })
      return data
    },
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  })
}

// 2. Relatório de Compras
export function usePurchasesReport(periodRef) {
  return useQuery({
    queryKey: ['reports', 'purchases', periodRef],
    queryFn: async () => {
      const { data } = await api.get('/reports/purchases', {
        params: { period: periodRef.value },
      })
      return data
    },
    staleTime: 1000 * 60 * 5,
  })
}

// 3. Relatório de Produtos
export function useProductsReport() {
  return useQuery({
    queryKey: ['reports', 'products'],
    queryFn: async () => {
      const { data } = await api.get('/reports/products')
      return data
    },
    staleTime: 1000 * 60 * 10, // Cache por 10 minutos
  })
}

// 4. Relatório de Pessoas
export function usePeopleReport() {
  return useQuery({
    queryKey: ['reports', 'people'],
    queryFn: async () => {
      const { data } = await api.get('/reports/people')
      return data
    },
    staleTime: 1000 * 60 * 10,
  })
}
