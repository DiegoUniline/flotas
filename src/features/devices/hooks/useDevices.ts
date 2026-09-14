import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  createDevice,
  fetchDeviceById,
  fetchDevices,
  softDeleteDevice,
  updateDevice,
  type DeviceFilters,
  type DeviceInsert,
  type DeviceSort,
  type DeviceUpdate,
} from '@/features/devices/api/devicesApi'

const PAGE_SIZE = 20

export function useDevicesQuery(filters: DeviceFilters, sort: DeviceSort, page: number) {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['devices', activeOrg?.id, filters, sort, page],
    queryFn: () => fetchDevices(activeOrg!.id, filters, sort, page, PAGE_SIZE),
    enabled: !!activeOrg,
    placeholderData: keepPreviousData,
  })
}

export { PAGE_SIZE }

export function useDevice(id: string | undefined) {
  return useQuery({
    queryKey: ['device', id],
    queryFn: () => fetchDeviceById(id!),
    enabled: !!id,
  })
}

export function useCreateDevice() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (input: DeviceInsert) => createDevice(activeOrg!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['devices', activeOrg?.id] })
      showToast('Dispositivo creado', 'success')
    },
    onError: () => showToast('No se pudo crear el dispositivo', 'error'),
  })
}

export function useUpdateDevice() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DeviceUpdate }) => updateDevice(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['devices', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['device', variables.id] })
      showToast('Dispositivo actualizado', 'success')
    },
    onError: () => showToast('No se pudo actualizar el dispositivo', 'error'),
  })
}

export function useDeleteDevice() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => softDeleteDevice(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['devices', activeOrg?.id] })
      showToast('Dispositivo eliminado', 'success')
    },
    onError: () => showToast('No se pudo eliminar el dispositivo', 'error'),
  })
}
