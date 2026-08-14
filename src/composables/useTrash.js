import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/vue-query'
import { computed, unref } from 'vue'
import api from '@/services/api'

export function useTrash({ page, perPage, busca, tipo }) {
  const queryClient = useQueryClient()

  // Computed para garantir reatividade exata na Query Key
  const queryParams = computed(() => ({
    page: unref(page),
    perPage: unref(perPage),
    busca: unref(busca),
    tipo: unref(tipo),
  }))

  // --- Query Principal: Listagem da Lixeira ---
  const trashQuery = useQuery({
    queryKey: ['trash', queryParams],
    queryFn: async () => {
      const params = {
        page: queryParams.value.page,
        per_page: queryParams.value.perPage,
      }

      if (queryParams.value.busca?.trim()) {
        params.busca = queryParams.value.busca.trim()
      }

      if (queryParams.value.tipo && queryParams.value.tipo !== 'todos') {
        params.tipo = queryParams.value.tipo
      }

      const { data } = await api.get('/trash', { params })
      return data
    },
    placeholderData: keepPreviousData, // Mantém os dados anteriores enquanto busca novos
  })

  // --- Mutation: Restaurar Registro ---
  const restoreMutation = useMutation({
    mutationFn: async (id) => {
      const { data } = await api.post(`/trash/${id}/restore`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] })
    },
  })

  // --- Mutation: Excluir Definitivamente ---
  const destroyMutation = useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/trash/${id}/destroy`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] })
    },
  })

  return {
    trashQuery,
    restoreMutation,
    destroyMutation,
    revalidarLixeira: () => queryClient.invalidateQueries({ queryKey: ['trash'] }),
  }
}
