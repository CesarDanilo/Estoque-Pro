import { useQuery } from '@tanstack/vue-query'
import api from '@/services/api'

// 1. Relatório de Vendas
export function useSalesReport(periodRef) {
  return useQuery({
    queryKey: ['reports', 'sales', periodRef],
    queryFn: async () => {
      const rawValue = typeof periodRef?.value === 'function' ? periodRef.value() : periodRef?.value
      const params =
        typeof rawValue === 'object' && rawValue !== null ? { ...rawValue } : { period: rawValue }

      const { data } = await api.get('/reports/sales', { params })
      return data
    },
    staleTime: 1000 * 60 * 5,
  })
}

// 2. Relatório de Compras
export function usePurchasesReport(periodRef) {
  return useQuery({
    queryKey: ['reports', 'purchases', periodRef],
    queryFn: async () => {
      const rawValue = typeof periodRef?.value === 'function' ? periodRef.value() : periodRef?.value
      const params =
        typeof rawValue === 'object' && rawValue !== null ? { ...rawValue } : { period: rawValue }

      const { data } = await api.get('/reports/purchases', { params })
      return data
    },
    staleTime: 1000 * 60 * 5,
  })
}

// 3. Relatório de Produtos
export function useProductsReport(periodRef) {
  return useQuery({
    queryKey: ['reports', 'products', periodRef],
    queryFn: async () => {
      const rawValue = periodRef
        ? typeof periodRef.value === 'function'
          ? periodRef.value()
          : periodRef?.value
        : null
      const params =
        typeof rawValue === 'object' && rawValue !== null
          ? { ...rawValue }
          : rawValue
            ? { period: rawValue }
            : {}

      const { data } = await api.get('/reports/products', { params })
      return data
    },
    staleTime: 1000 * 60 * 10,
  })
}

// 4. Relatório de Pessoas
export function usePeopleReport(periodRef) {
  return useQuery({
    queryKey: ['reports', 'people', periodRef],
    queryFn: async () => {
      const rawValue = typeof periodRef?.value === 'function' ? periodRef.value() : periodRef?.value
      const params =
        typeof rawValue === 'object' && rawValue !== null
          ? { ...rawValue }
          : rawValue
            ? { period: rawValue }
            : {}

      const { data } = await api.get('/reports/people', { params })
      return data
    },
    staleTime: 1000 * 60 * 10,
  })
}
