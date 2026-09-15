import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  fetchOrganizationMembers,
  removeOrganizationMember,
  updateOrganizationMember,
  type OrganizationMemberUpdate,
} from '@/features/users/api/organizationMembersApi'

export function useOrganizationMembersQuery() {
  const { activeOrg } = useOrg()
  return useQuery({
    queryKey: ['organization-members', activeOrg?.id],
    queryFn: () => fetchOrganizationMembers(activeOrg!.id),
    enabled: !!activeOrg,
  })
}

export function useUpdateOrganizationMember() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: OrganizationMemberUpdate }) => updateOrganizationMember(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organization-members', activeOrg?.id] })
      showToast('Miembro actualizado', 'success')
    },
    onError: (error: Error) => showToast(error.message || 'No se pudo actualizar el miembro', 'error'),
  })
}

export function useRemoveOrganizationMember() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (id: string) => removeOrganizationMember(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organization-members', activeOrg?.id] })
      showToast('Miembro eliminado de la organización', 'success')
    },
    onError: (error: Error) => showToast(error.message || 'No se pudo eliminar al miembro', 'error'),
  })
}
