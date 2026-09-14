import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import { fetchLocationOptions } from '@/features/locations/api/locationsApi'
import {
  createDriver,
  fetchDriverOptions,
  fetchDrivers,
  softDeleteDriver,
  updateDriver,
  type DriverFilters,
  type DriverInsert,
  type DriverSort,
  type DriverUpdate,
} from '@/features/drivers/api/driversApi'

const PAGE_SIZE = 20

export function useDriversQuery(filters: DriverFilters, sort: DriverSort, page: number) {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['drivers', activeOrg?.id, filters, sort, page],
    queryFn: () => fetchDrivers(activeOrg!.id, filters, sort, page, PAGE_SIZE),
    enabled: !!activeOrg,
    placeholderData: keepPreviousData,
  })
}

export { PAGE_SIZE }

export function useDriverOptions() {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['driver-options', activeOrg?.id],
    queryFn: () => fetchDriverOptions(activeOrg!.id),
    enabled: !!activeOrg,
  })
}

export function useDriverLocationOptions() {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['location-options', activeOrg?.id],
    queryFn: () => fetchLocationOptions(activeOrg!.id),
    enabled: !!activeOrg,
  })
}

export function useCreateDriver() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (input: DriverInsert) => createDriver(activeOrg!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['drivers', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['driver-options', activeOrg?.id] })
      showToast('Operador creado', 'success')
    },
    onError: () => showToast('No se pudo crear el operador', 'error'),
  })
}

export function useUpdateDriver() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DriverUpdate }) => updateDriver(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['drivers', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['driver-options', activeOrg?.id] })
      showToast('Operador actualizado', 'success')
    },
    onError: () => showToast('No se pudo actualizar el operador', 'error'),
  })
}

export function useDeleteDriver() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => softDeleteDriver(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['drivers', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['driver-options', activeOrg?.id] })
      showToast('Operador eliminado', 'success')
    },
    onError: () => showToast('No se pudo eliminar el operador', 'error'),
  })
}
