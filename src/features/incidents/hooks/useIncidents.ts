import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  createIncident,
  fetchIncidentById,
  fetchIncidents,
  softDeleteIncident,
  updateIncident,
  type IncidentFilters,
  type IncidentInsert,
  type IncidentSort,
  type IncidentUpdate,
} from '@/features/incidents/api/incidentsApi'

const PAGE_SIZE = 20

export function useIncidentsQuery(filters: IncidentFilters, sort: IncidentSort, page: number) {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['incidents', activeOrg?.id, filters, sort, page],
    queryFn: () => fetchIncidents(activeOrg!.id, filters, sort, page, PAGE_SIZE),
    enabled: !!activeOrg,
    placeholderData: keepPreviousData,
  })
}

export { PAGE_SIZE }

export function useIncident(id: string | undefined) {
  return useQuery({
    queryKey: ['incident', id],
    queryFn: () => fetchIncidentById(id!),
    enabled: !!id,
  })
}

export function useCreateIncident() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (input: IncidentInsert) => createIncident(activeOrg!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['incidents', activeOrg?.id] })
      showToast('Incidente registrado', 'success')
    },
    onError: () => showToast('No se pudo registrar el incidente', 'error'),
  })
}

export function useUpdateIncident() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: IncidentUpdate }) => updateIncident(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['incidents', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['incident', variables.id] })
      showToast('Incidente actualizado', 'success')
    },
    onError: () => showToast('No se pudo actualizar el incidente', 'error'),
  })
}

export function useDeleteIncident() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => softDeleteIncident(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['incidents', activeOrg?.id] })
      showToast('Incidente eliminado', 'success')
    },
    onError: () => showToast('No se pudo eliminar el incidente', 'error'),
  })
}
