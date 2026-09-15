import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/context/ToastContext'
import { fetchOrganizationById, updateOrganization, type CompanyOrganizationUpdate } from '@/features/company/api/companyApi'

export function useCompanyQuery(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['company', organizationId],
    queryFn: () => fetchOrganizationById(organizationId!),
    enabled: !!organizationId,
  })
}

export function useUpdateCompany(organizationId: string | undefined) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (input: CompanyOrganizationUpdate) => updateOrganization(organizationId!, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['company', organizationId] })
      void queryClient.invalidateQueries({ queryKey: ['my-organizations'] })
      showToast('Empresa actualizada', 'success')
    },
    onError: () => showToast('No se pudo actualizar la empresa', 'error'),
  })
}
