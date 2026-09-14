import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  createLocation,
  fetchLocationById,
  fetchLocations,
  softDeleteLocation,
  updateLocation,
  type LocationFilters,
  type LocationInsert,
  type LocationSort,
  type LocationUpdate,
} from '@/features/locations/api/locationsApi'

const PAGE_SIZE = 20

export function useLocationsQuery(filters: LocationFilters, sort: LocationSort, page: number) {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['locations', activeOrg?.id, filters, sort, page],
    queryFn: () => fetchLocations(activeOrg!.id, filters, sort, page, PAGE_SIZE),
    enabled: !!activeOrg,
    placeholderData: keepPreviousData,
  })
}

export { PAGE_SIZE }

export function useLocation(id: string | undefined) {
  return useQuery({
    queryKey: ['location', id],
    queryFn: () => fetchLocationById(id!),
    enabled: !!id,
  })
}

export function useCreateLocation() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (input: LocationInsert) => createLocation(activeOrg!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['locations', activeOrg?.id] })
      showToast('Sucursal creada', 'success')
    },
    onError: () => showToast('No se pudo crear la sucursal', 'error'),
  })
}

export function useUpdateLocation() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LocationUpdate }) => updateLocation(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['locations', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['location', variables.id] })
      showToast('Sucursal actualizada', 'success')
    },
    onError: () => showToast('No se pudo actualizar la sucursal', 'error'),
  })
}

export function useDeleteLocation() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => softDeleteLocation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['locations', activeOrg?.id] })
      showToast('Sucursal eliminada', 'success')
    },
    onError: () => showToast('No se pudo eliminar la sucursal', 'error'),
  })
}
