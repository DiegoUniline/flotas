import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  createJob,
  fetchJobById,
  fetchJobs,
  softDeleteJob,
  updateJob,
  type JobFilters,
  type JobInsert,
  type JobSort,
  type JobUpdate,
} from '@/features/jobs/api/jobsApi'

const PAGE_SIZE = 20

export function useJobsQuery(filters: JobFilters, sort: JobSort, page: number) {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['jobs', activeOrg?.id, filters, sort, page],
    queryFn: () => fetchJobs(activeOrg!.id, filters, sort, page, PAGE_SIZE),
    enabled: !!activeOrg,
    placeholderData: keepPreviousData,
  })
}

export { PAGE_SIZE }

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => fetchJobById(id!),
    enabled: !!id,
  })
}

export function useCreateJob() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (input: JobInsert) => createJob(activeOrg!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['jobs', activeOrg?.id] })
      showToast('Pedido creado', 'success')
    },
    onError: () => showToast('No se pudo crear el pedido', 'error'),
  })
}

export function useUpdateJob() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: JobUpdate }) => updateJob(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['jobs', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['job', variables.id] })
      showToast('Pedido actualizado', 'success')
    },
    onError: () => showToast('No se pudo actualizar el pedido', 'error'),
  })
}

export function useDeleteJob() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => softDeleteJob(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['jobs', activeOrg?.id] })
      showToast('Pedido eliminado', 'success')
    },
    onError: () => showToast('No se pudo eliminar el pedido', 'error'),
  })
}
