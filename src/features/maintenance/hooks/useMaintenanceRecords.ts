import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  createMaintenanceRecord,
  fetchMaintenanceRecordById,
  fetchMaintenanceRecords,
  softDeleteMaintenanceRecord,
  updateMaintenanceRecord,
  type MaintenanceRecordFilters,
  type MaintenanceRecordInsert,
  type MaintenanceRecordSort,
  type MaintenanceRecordUpdate,
} from '@/features/maintenance/api/maintenanceRecordsApi'

const PAGE_SIZE = 20

export function useMaintenanceRecordsQuery(filters: MaintenanceRecordFilters, sort: MaintenanceRecordSort, page: number) {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['maintenance-records', activeOrg?.id, filters, sort, page],
    queryFn: () => fetchMaintenanceRecords(activeOrg!.id, filters, sort, page, PAGE_SIZE),
    enabled: !!activeOrg,
    placeholderData: keepPreviousData,
  })
}

export { PAGE_SIZE }

export function useMaintenanceRecord(id: string | undefined) {
  return useQuery({
    queryKey: ['maintenance-record', id],
    queryFn: () => fetchMaintenanceRecordById(id!),
    enabled: !!id,
  })
}

export function useCreateMaintenanceRecord() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (input: MaintenanceRecordInsert) => createMaintenanceRecord(activeOrg!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance-records', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance-due', activeOrg?.id] })
      showToast('Servicio registrado', 'success')
    },
    onError: () => showToast('No se pudo registrar el servicio', 'error'),
  })
}

export function useUpdateMaintenanceRecord() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MaintenanceRecordUpdate }) => updateMaintenanceRecord(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance-records', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance-record', variables.id] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance-due', activeOrg?.id] })
      showToast('Servicio actualizado', 'success')
    },
    onError: () => showToast('No se pudo actualizar el servicio', 'error'),
  })
}

export function useDeleteMaintenanceRecord() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => softDeleteMaintenanceRecord(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance-records', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance-due', activeOrg?.id] })
      showToast('Servicio eliminado', 'success')
    },
    onError: () => showToast('No se pudo eliminar el servicio', 'error'),
  })
}
