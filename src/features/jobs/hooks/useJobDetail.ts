import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  createJobPackage,
  deleteJobPackage,
  fetchJobPackages,
  updateJobPackage,
  type JobPackageInsert,
  type JobPackageUpdate,
} from '@/features/jobs/api/jobPackagesApi'

export function useJobPackages(jobId: string | undefined) {
  return useQuery({
    queryKey: ['job-packages', jobId],
    queryFn: () => fetchJobPackages(jobId!),
    enabled: !!jobId,
  })
}

export function useCreateJobPackage(jobId: string) {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (input: JobPackageInsert) => createJobPackage(activeOrg!.id, jobId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['job-packages', jobId] })
    },
    onError: () => showToast('No se pudo agregar el paquete', 'error'),
  })
}

export function useUpdateJobPackage(jobId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: JobPackageUpdate }) => updateJobPackage(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['job-packages', jobId] })
    },
    onError: () => showToast('No se pudo actualizar el paquete', 'error'),
  })
}

export function useDeleteJobPackage(jobId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (id: string) => deleteJobPackage(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['job-packages', jobId] })
      showToast('Paquete eliminado', 'success')
    },
    onError: () => showToast('No se pudo eliminar el paquete', 'error'),
  })
}
