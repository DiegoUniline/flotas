import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  createInspectionTemplate,
  fetchInspectionTemplateById,
  fetchInspectionTemplates,
  softDeleteInspectionTemplate,
  updateInspectionTemplate,
  type InspectionTemplateInsert,
  type InspectionTemplateUpdate,
} from '@/features/inspections/api/inspectionTemplatesApi'

export function useInspectionTemplatesQuery() {
  const { activeOrg } = useOrg()
  return useQuery({
    queryKey: ['inspection-templates', activeOrg?.id],
    queryFn: () => fetchInspectionTemplates(activeOrg!.id),
    enabled: !!activeOrg,
  })
}

export function useInspectionTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['inspection-template', id],
    queryFn: () => fetchInspectionTemplateById(id!),
    enabled: !!id,
  })
}

export function useCreateInspectionTemplate() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (input: InspectionTemplateInsert) => createInspectionTemplate(activeOrg!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inspection-templates', activeOrg?.id] })
      showToast('Plantilla creada', 'success')
    },
    onError: () => showToast('No se pudo crear la plantilla', 'error'),
  })
}

export function useUpdateInspectionTemplate() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: InspectionTemplateUpdate }) => updateInspectionTemplate(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['inspection-templates', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['inspection-template', variables.id] })
      showToast('Plantilla actualizada', 'success')
    },
    onError: () => showToast('No se pudo actualizar la plantilla', 'error'),
  })
}

export function useDeleteInspectionTemplate() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => softDeleteInspectionTemplate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inspection-templates', activeOrg?.id] })
      showToast('Plantilla eliminada', 'success')
    },
    onError: () => showToast('No se pudo eliminar la plantilla', 'error'),
  })
}
