import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  createGeofence,
  fetchGeofenceById,
  fetchGeofences,
  softDeleteGeofence,
  updateGeofence,
  type GeofenceFilters,
  type GeofenceInsert,
  type GeofenceSort,
  type GeofenceUpdate,
} from '@/features/geofences/api/geofencesApi'

const PAGE_SIZE = 20

export function useGeofencesQuery(filters: GeofenceFilters, sort: GeofenceSort, page: number) {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['geofences', activeOrg?.id, filters, sort, page],
    queryFn: () => fetchGeofences(activeOrg!.id, filters, sort, page, PAGE_SIZE),
    enabled: !!activeOrg,
    placeholderData: keepPreviousData,
  })
}

export { PAGE_SIZE }

export function useGeofence(id: string | undefined) {
  return useQuery({
    queryKey: ['geofence', id],
    queryFn: () => fetchGeofenceById(id!),
    enabled: !!id,
  })
}

export function useCreateGeofence() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (input: GeofenceInsert) => createGeofence(activeOrg!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['geofences', activeOrg?.id] })
      showToast('Geocerca creada', 'success')
    },
    onError: () => showToast('No se pudo crear la geocerca', 'error'),
  })
}

export function useUpdateGeofence() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: GeofenceUpdate }) => updateGeofence(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['geofences', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['geofence', variables.id] })
      showToast('Geocerca actualizada', 'success')
    },
    onError: () => showToast('No se pudo actualizar la geocerca', 'error'),
  })
}

export function useDeleteGeofence() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => softDeleteGeofence(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['geofences', activeOrg?.id] })
      showToast('Geocerca eliminada', 'success')
    },
    onError: () => showToast('No se pudo eliminar la geocerca', 'error'),
  })
}
