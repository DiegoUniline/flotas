import { keepPreviousData, useMutation, useQuery, useQueryClient, type MutateOptions } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  fetchJobById,
  fetchJobs,
  fetchMyJobs,
  softDeleteJob,
  updateJob,
  type Job,
  type JobFilters,
  type JobInsert,
  type JobSort,
  type JobUpdate,
} from '@/features/jobs/api/jobsApi'

interface CreateJobVariables {
  organizationId: string
  input: JobInsert
}

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

/** `mutationKey` en vez de un `mutationFn` inline: la función real vive
 * registrada una sola vez en `queryClient.setMutationDefaults` (ver
 * `lib/queryClient.ts`) — necesario para que, si la mutación queda pausada
 * sin conexión y la pestaña se cierra o recarga, `PersistQueryClientProvider`
 * pueda revivirla y reintentarla al reconectar sin depender de una
 * función serializada (las funciones no se pueden guardar en localStorage).
 * Las variables van explícitas (`organizationId` + `input`) por el mismo
 * motivo — nada de leer `activeOrg` de un closure que puede no existir
 * todavía durante ese reintento en segundo plano. */
export function useCreateJob() {
  const { activeOrg } = useOrg()
  const { showToast } = useToast()

  const mutation = useMutation<Job, Error, CreateJobVariables>({
    mutationKey: ['create-job'],
    onSuccess: () => showToast('Pedido creado', 'success'),
    onError: () => showToast('No se pudo crear el pedido', 'error'),
  })

  return {
    ...mutation,
    mutate: (input: JobInsert, options?: MutateOptions<Job, Error, CreateJobVariables>) =>
      mutation.mutate({ organizationId: activeOrg!.id, input }, options),
    mutateAsync: (input: JobInsert) => mutation.mutateAsync({ organizationId: activeOrg!.id, input }),
  }
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

export function useMyJobs(driverId: string | undefined) {
  return useQuery({
    queryKey: ['my-jobs', driverId],
    queryFn: () => fetchMyJobs(driverId!),
    enabled: !!driverId,
    refetchInterval: 60000,
  })
}

/** Igual que `useUpdateJob` pero sin el toast genérico "Pedido actualizado"
 * — la app del repartidor (`MyJobsPage`) usa su propio toast con el nombre
 * del estado nuevo, más claro para ese flujo de una sola acción por tap. */
export function useUpdateJobSilent() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: JobUpdate }) => updateJob(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['jobs', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['job', variables.id] })
      void queryClient.invalidateQueries({ queryKey: ['my-jobs'] })
    },
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
