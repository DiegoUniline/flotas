import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  createInspectionTemplateItem,
  deleteInspectionTemplateItem,
  fetchInspectionTemplateItems,
  updateInspectionTemplateItem,
  type InspectionTemplateItemUpdate,
} from '@/features/inspections/api/inspectionTemplateItemsApi'

export function useInspectionTemplateItems(templateId: string | undefined) {
  return useQuery({
    queryKey: ['inspection-template-items', templateId],
    queryFn: () => fetchInspectionTemplateItems(templateId!),
    enabled: !!templateId,
  })
}

export function useCreateInspectionTemplateItem(templateId: string) {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: ({ label, sortOrder }: { label: string; sortOrder: number }) =>
      createInspectionTemplateItem(activeOrg!.id, templateId, label, sortOrder),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inspection-template-items', templateId] })
    },
    onError: () => showToast('No se pudo agregar el ítem', 'error'),
  })
}

export function useUpdateInspectionTemplateItem(templateId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: InspectionTemplateItemUpdate }) => updateInspectionTemplateItem(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inspection-template-items', templateId] })
    },
    onError: () => showToast('No se pudo actualizar el ítem', 'error'),
  })
}

export function useDeleteInspectionTemplateItem(templateId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (id: string) => deleteInspectionTemplateItem(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inspection-template-items', templateId] })
      showToast('Ítem eliminado', 'success')
    },
    onError: () => showToast('No se pudo eliminar el ítem', 'error'),
  })
}
