import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { groupService } from '@/services/groupService'

export function useGroups(buscaRef) {
  const queryClient = useQueryClient()

  // 1. QUERY: Buscar lista de grupos (Com Cache e suporte a Busca)
  const groupsQuery = useQuery({
    queryKey: ['groups', buscaRef],
    queryFn: () => groupService.listar({ search: buscaRef?.value || '' }),
    select: (data) => (Array.isArray(data) ? data : data.data || []),
  })

  // 2. MUTATION: Criar novo grupo
  const createMutation = useMutation({
    mutationFn: (payload) => groupService.criar(payload),
    onSuccess: () => {
      // Invalida o cache e força a atualização automática da lista de grupos
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
