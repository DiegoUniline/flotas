import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  createInspection,
  fetchInspectionById,
  fetchInspections,
  softDeleteInspection,
  updateInspection,
  type InspectionFilters,
  type InspectionInsert,
  type InspectionSort,
  type InspectionUpdate,
} from '@/features/inspections/api/inspectionsApi'

const PAGE_SIZE = 20

export function useInspectionsQuery(filters: InspectionFilters, sort: InspectionSort, page: number) {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['inspections', activeOrg?.id, filters, sort, page],
    queryFn: () => fetchInspections(activeOrg!.id, filters, sort, page, PAGE_SIZE),
    enabled: !!activeOrg,
    placeholderData: keepPreviousData,
  })
}

export { PAGE_SIZE }

export function useInspection(id: string | undefined) {
  return useQuery({
    queryKey: ['inspection', id],
    queryFn: () => fetchInspectionById(id!),
    enabled: !!id,
  })
}

export function useCreateInspection() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (input: InspectionInsert) => createInspection(activeOrg!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inspections', activeOrg?.id] })
      showToast('Inspección registrada', 'success')
    },
    onError: () => showToast('No se pudo registrar la inspección', 'error'),
  })
}

export function useUpdateInspection() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: InspectionUpdate }) => updateInspection(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['inspections', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['inspection', variables.id] })
      showToast('Inspección actualizada', 'success')
    },
    onError: () => showToast('No se pudo actualizar la inspección', 'error'),
  })
}

export function useDeleteInspection() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => softDeleteInspection(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inspections', activeOrg?.id] })
      showToast('Inspección eliminada', 'success')
    },
    onError: () => showToast('No se pudo eliminar la inspección', 'error'),
  })
}
