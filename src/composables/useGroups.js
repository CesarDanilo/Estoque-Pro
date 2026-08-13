import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { groupService } from '@/services/groupService'

export function useGroups(buscaRef, paginaRef) {
  const queryClient = useQueryClient()

  // 1. QUERY: Buscar lista de grupos (paginada, com busca)
  const groupsQuery = useQuery({
    queryKey: ['groups', buscaRef, paginaRef],
    queryFn: () =>
      groupService.listar({
        search: buscaRef?.value || '',
        page: paginaRef?.value || 1,
      }),
  })

  // 2. MUTATION: Criar novo grupo
  const createMutation = useMutation({
    mutationFn: (payload) => groupService.criar(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })

  // 3. MUTATION: Atualizar grupo existente
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => groupService.atualizar(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })

  // 4. MUTATION: Deletar grupo
  const deleteMutation = useMutation({
    mutationFn: (id) => groupService.deletar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })

  return {
    groupsQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  }
}
