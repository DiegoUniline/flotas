import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import { fetchInspectionItemResults, saveInspectionItemResults, type ItemResultInput } from '@/features/inspections/api/inspectionItemResultsApi'

export function useInspectionItemResults(inspectionId: string | undefined) {
  return useQuery({
    queryKey: ['inspection-item-results', inspectionId],
    queryFn: () => fetchInspectionItemResults(inspectionId!),
    enabled: !!inspectionId,
  })
}

export function useSaveInspectionItemResults(inspectionId: string) {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (items: ItemResultInput[]) => saveInspectionItemResults(activeOrg!.id, inspectionId, items),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inspection-item-results', inspectionId] })
    },
    onError: () => showToast('No se pudo guardar el checklist', 'error'),
  })
}
