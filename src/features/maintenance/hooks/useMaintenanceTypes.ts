import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  createMaintenanceType,
  fetchMaintenanceTypeById,
  fetchMaintenanceTypes,
  softDeleteMaintenanceType,
  updateMaintenanceType,
  type MaintenanceTypeInsert,
  type MaintenanceTypeUpdate,
} from '@/features/maintenance/api/maintenanceTypesApi'

export function useMaintenanceTypesQuery() {
  const { activeOrg } = useOrg()
  return useQuery({
    queryKey: ['maintenance-types', activeOrg?.id],
    queryFn: () => fetchMaintenanceTypes(activeOrg!.id),
    enabled: !!activeOrg,
  })
}

export function useMaintenanceType(id: string | undefined) {
  return useQuery({
    queryKey: ['maintenance-type', id],
    queryFn: () => fetchMaintenanceTypeById(id!),
    enabled: !!id,
  })
}

export function useCreateMaintenanceType() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (input: MaintenanceTypeInsert) => createMaintenanceType(activeOrg!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance-types', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance-type-options', activeOrg?.id] })
      showToast('Tipo de servicio creado', 'success')
    },
    onError: () => showToast('No se pudo crear el tipo de servicio', 'error'),
  })
}

export function useUpdateMaintenanceType() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MaintenanceTypeUpdate }) => updateMaintenanceType(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance-types', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance-type', variables.id] })
      showToast('Tipo de servicio actualizado', 'success')
    },
    onError: () => showToast('No se pudo actualizar el tipo de servicio', 'error'),
  })
}

export function useDeleteMaintenanceType() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => softDeleteMaintenanceType(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance-types', activeOrg?.id] })
      showToast('Tipo de servicio eliminado', 'success')
    },
    onError: () => showToast('No se pudo eliminar el tipo de servicio', 'error'),
  })
}
