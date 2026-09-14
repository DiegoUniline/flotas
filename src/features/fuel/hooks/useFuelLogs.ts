import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  createFuelLog,
  fetchFuelLogById,
  fetchFuelLogs,
  softDeleteFuelLog,
  updateFuelLog,
  type FuelLogFilters,
  type FuelLogInsert,
  type FuelLogSort,
  type FuelLogUpdate,
} from '@/features/fuel/api/fuelLogsApi'

const PAGE_SIZE = 20

export function useFuelLogsQuery(filters: FuelLogFilters, sort: FuelLogSort, page: number) {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['fuel-logs', activeOrg?.id, filters, sort, page],
    queryFn: () => fetchFuelLogs(activeOrg!.id, filters, sort, page, PAGE_SIZE),
    enabled: !!activeOrg,
    placeholderData: keepPreviousData,
  })
}

export { PAGE_SIZE }

export function useFuelLog(id: string | undefined) {
  return useQuery({
    queryKey: ['fuel-log', id],
    queryFn: () => fetchFuelLogById(id!),
    enabled: !!id,
  })
}

export function useCreateFuelLog() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (input: FuelLogInsert) => createFuelLog(activeOrg!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fuel-logs', activeOrg?.id] })
      showToast('Carga de combustible registrada', 'success')
    },
    onError: () => showToast('No se pudo registrar la carga', 'error'),
  })
}

export function useUpdateFuelLog() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FuelLogUpdate }) => updateFuelLog(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['fuel-logs', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['fuel-log', variables.id] })
      showToast('Carga de combustible actualizada', 'success')
    },
    onError: () => showToast('No se pudo actualizar la carga', 'error'),
  })
}

export function useDeleteFuelLog() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => softDeleteFuelLog(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fuel-logs', activeOrg?.id] })
      showToast('Carga de combustible eliminada', 'success')
    },
    onError: () => showToast('No se pudo eliminar la carga', 'error'),
  })
}
