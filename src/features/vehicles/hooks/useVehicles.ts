import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import { fetchLocationOptions } from '@/features/locations/api/locationsApi'
import { fetchDriverOptions } from '@/features/drivers/api/driversApi'
import {
  createVehicle,
  fetchVehicleGroupOptions,
  fetchVehicleTypeOptions,
  fetchVehicles,
  softDeleteVehicle,
  updateVehicle,
  type VehicleFilters,
  type VehicleInsert,
  type VehicleSort,
  type VehicleUpdate,
} from '@/features/vehicles/api/vehiclesApi'

const PAGE_SIZE = 20

export function useVehiclesQuery(filters: VehicleFilters, sort: VehicleSort, page: number) {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['vehicles', activeOrg?.id, filters, sort, page],
    queryFn: () => fetchVehicles(activeOrg!.id, filters, sort, page, PAGE_SIZE),
    enabled: !!activeOrg,
    placeholderData: keepPreviousData,
  })
}

export { PAGE_SIZE }

export function useLocationOptions() {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['location-options', activeOrg?.id],
    queryFn: () => fetchLocationOptions(activeOrg!.id),
    enabled: !!activeOrg,
  })
}

export function useVehicleTypeOptions() {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['vehicle-type-options', activeOrg?.id],
    queryFn: () => fetchVehicleTypeOptions(activeOrg!.id),
    enabled: !!activeOrg,
  })
}

export function useVehicleGroupOptions() {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['vehicle-group-options', activeOrg?.id],
    queryFn: () => fetchVehicleGroupOptions(activeOrg!.id),
    enabled: !!activeOrg,
  })
}

export function useVehicleDriverOptions() {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['driver-options', activeOrg?.id],
    queryFn: () => fetchDriverOptions(activeOrg!.id),
    enabled: !!activeOrg,
  })
}

export function useCreateVehicle() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (input: VehicleInsert) => createVehicle(activeOrg!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles', activeOrg?.id] })
      showToast('Vehículo creado', 'success')
    },
    onError: () => showToast('No se pudo crear el vehículo', 'error'),
  })
}

export function useUpdateVehicle() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: VehicleUpdate }) => updateVehicle(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles', activeOrg?.id] })
      showToast('Vehículo actualizado', 'success')
    },
    onError: () => showToast('No se pudo actualizar el vehículo', 'error'),
  })
}

export function useDeleteVehicle() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => softDeleteVehicle(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles', activeOrg?.id] })
      showToast('Vehículo eliminado', 'success')
    },
    onError: () => showToast('No se pudo eliminar el vehículo', 'error'),
  })
}
