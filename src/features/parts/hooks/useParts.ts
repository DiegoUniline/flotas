import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  createPart,
  fetchPartById,
  fetchParts,
  softDeletePart,
  updatePart,
  type PartFilters,
  type PartInsert,
  type PartSort,
  type PartUpdate,
} from '@/features/parts/api/partsApi'

const PAGE_SIZE = 20

export function usePartsQuery(filters: PartFilters, sort: PartSort, page: number) {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['parts', activeOrg?.id, filters, sort, page],
    queryFn: () => fetchParts(activeOrg!.id, filters, sort, page, PAGE_SIZE),
    enabled: !!activeOrg,
    placeholderData: keepPreviousData,
  })
}

export { PAGE_SIZE }

export function usePart(id: string | undefined) {
  return useQuery({
    queryKey: ['part', id],
    queryFn: () => fetchPartById(id!),
    enabled: !!id,
  })
}

export function useCreatePart() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (input: PartInsert) => createPart(activeOrg!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['parts', activeOrg?.id] })
      showToast('Refacción creada', 'success')
    },
    onError: () => showToast('No se pudo crear la refacción', 'error'),
  })
}

export function useUpdatePart() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PartUpdate }) => updatePart(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['parts', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['part', variables.id] })
      showToast('Refacción actualizada', 'success')
    },
    onError: () => showToast('No se pudo actualizar la refacción', 'error'),
  })
}

export function useDeletePart() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => softDeletePart(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['parts', activeOrg?.id] })
      showToast('Refacción eliminada', 'success')
    },
    onError: () => showToast('No se pudo eliminar la refacción', 'error'),
  })
}
