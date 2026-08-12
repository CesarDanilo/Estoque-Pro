import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { supplierService } from '@/services/supplierService'
import { useFeedback } from '@/composables/useFeedBack'

export function useSuppliers(searchRef) {
  const queryClient = useQueryClient()
  const { sucesso, erro } = useFeedback()

  // ---- Fetch List (Query) ----
  const suppliersQuery = useQuery({
    queryKey: ['suppliers', searchRef],
    queryFn: () => supplierService.getAll(searchRef.value),
    staleTime: 1000 * 60 * 5, // Cache de 5 minutos
  })

  // ---- Deletar Fornecedor (Mutation) ----
  const deleteMutation = useMutation({
    mutationFn: (id) => supplierService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      sucesso('Fornecedor removido', 'O fornecedor foi excluído com sucesso.')
    },
    onError: (err) => {
      erro(
        'Erro ao excluir',
        err.response?.data?.message || 'Não foi possível remover o fornecedor.',
      )
    },
  })

  return {
    suppliers: suppliersQuery.data,
    isLoading: suppliersQuery.isLoading,
    isError: suppliersQuery.isError,
    refetch: suppliersQuery.refetch,
    deleteSupplier: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  }
}
