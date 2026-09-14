import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import { fetchDriverOptions } from '@/features/drivers/api/driversApi'
import { fetchVehicleOptions } from '@/features/vehicles/api/vehiclesApi'
import { fetchLocationOptions } from '@/features/locations/api/locationsApi'
import { fetchPendingJobOptions } from '@/features/jobs/api/jobsApi'
import {
  createRoutePlan,
  fetchRoutePlanById,
  fetchRoutePlans,
  updateRoutePlan,
  type RoutePlanFilters,
  type RoutePlanInsert,
  type RoutePlanUpdate,
} from '@/features/routes/api/routePlansApi'
import {
  addStopFromJob,
  deleteRouteStop,
  fetchRouteStops,
  markStopStatus,
} from '@/features/routes/api/routeStopsApi'

export function useRoutePlansQuery(filters: RoutePlanFilters) {
  const { activeOrg } = useOrg()
  return useQuery({
    queryKey: ['route-plans', activeOrg?.id, filters],
    queryFn: () => fetchRoutePlans(activeOrg!.id, filters),
    enabled: !!activeOrg,
  })
}

export function useRoutePlan(routeId: string | undefined) {
  return useQuery({
    queryKey: ['route-plan', routeId],
    queryFn: () => fetchRoutePlanById(routeId!),
    enabled: !!routeId,
  })
}

export function useRouteDriverOptions() {
  const { activeOrg } = useOrg()
  return useQuery({
    queryKey: ['driver-options', activeOrg?.id],
    queryFn: () => fetchDriverOptions(activeOrg!.id),
    enabled: !!activeOrg,
  })
}

export function useRouteVehicleOptions() {
  const { activeOrg } = useOrg()
  return useQuery({
    queryKey: ['vehicle-options', activeOrg?.id],
    queryFn: () => fetchVehicleOptions(activeOrg!.id),
    enabled: !!activeOrg,
  })
}

export function useRouteLocationOptions() {
  const { activeOrg } = useOrg()
  return useQuery({
    queryKey: ['location-options', activeOrg?.id],
    queryFn: () => fetchLocationOptions(activeOrg!.id),
    enabled: !!activeOrg,
  })
}

export function useCreateRoutePlan() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (input: RoutePlanInsert) => createRoutePlan(activeOrg!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['route-plans', activeOrg?.id] })
      showToast('Ruta creada', 'success')
    },
    onError: () => showToast('No se pudo crear la ruta', 'error'),
  })
}

export function useUpdateRoutePlan(routeId?: string) {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RoutePlanUpdate }) => updateRoutePlan(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['route-plans', activeOrg?.id] })
      if (routeId) void queryClient.invalidateQueries({ queryKey: ['route-plan', routeId] })
      showToast('Ruta actualizada', 'success')
    },
    onError: () => showToast('No se pudo actualizar la ruta', 'error'),
  })
}

// Stops

export function useRouteStops(routePlanId: string | undefined) {
  return useQuery({
    queryKey: ['route-stops', routePlanId],
    queryFn: () => fetchRouteStops(routePlanId!),
    enabled: !!routePlanId,
  })
}

export function usePendingJobOptions(scheduledDate?: string) {
  const { activeOrg } = useOrg()
  return useQuery({
    queryKey: ['pending-job-options', activeOrg?.id, scheduledDate],
    queryFn: () => fetchPendingJobOptions(activeOrg!.id, scheduledDate),
    enabled: !!activeOrg,
  })
}

export function useAddStopFromJob(routePlanId: string) {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (jobId: string) => addStopFromJob(activeOrg!.id, routePlanId, jobId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['route-stops', routePlanId] })
      showToast('Parada agregada', 'success')
    },
    onError: () => showToast('No se pudo agregar la parada', 'error'),
  })
}

export function useMarkStopStatus(routePlanId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => markStopStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['route-stops', routePlanId] })
      showToast('Parada actualizada', 'success')
    },
    onError: () => showToast('No se pudo actualizar la parada', 'error'),
  })
}

export function useDeleteRouteStop(routePlanId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (id: string) => deleteRouteStop(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['route-stops', routePlanId] })
      showToast('Parada eliminada', 'success')
    },
    onError: () => showToast('No se pudo eliminar la parada', 'error'),
  })
}
