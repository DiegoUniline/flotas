import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  createMaintenanceRecordPart,
  deleteMaintenanceRecordPart,
  fetchMaintenanceRecordParts,
  updateMaintenanceRecordPart,
  type MaintenanceRecordPartInsert,
  type MaintenanceRecordPartUpdate,
} from '@/features/maintenance/api/maintenanceRecordPartsApi'

export function useMaintenanceRecordParts(maintenanceRecordId: string | undefined) {
  return useQuery({
    queryKey: ['maintenance-record-parts', maintenanceRecordId],
    queryFn: () => fetchMaintenanceRecordParts(maintenanceRecordId!),
    enabled: !!maintenanceRecordId,
  })
}

export function useCreateMaintenanceRecordPart(maintenanceRecordId: string) {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (input: MaintenanceRecordPartInsert) => createMaintenanceRecordPart(activeOrg!.id, maintenanceRecordId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance-record-parts', maintenanceRecordId] })
    },
    onError: () => showToast('No se pudo agregar la refacción', 'error'),
  })
}

export function useUpdateMaintenanceRecordPart(maintenanceRecordId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MaintenanceRecordPartUpdate }) => updateMaintenanceRecordPart(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance-record-parts', maintenanceRecordId] })
    },
    onError: () => showToast('No se pudo actualizar la refacción', 'error'),
  })
}

export function useDeleteMaintenanceRecordPart(maintenanceRecordId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (id: string) => deleteMaintenanceRecordPart(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance-record-parts', maintenanceRecordId] })
      showToast('Refacción eliminada', 'success')
    },
    onError: () => showToast('No se pudo eliminar la refacción', 'error'),
  })
}
