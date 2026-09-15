import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import {
  createOrganizationInvite,
  fetchPendingInvites,
  revokeOrganizationInvite,
  type OrganizationInviteInsert,
} from '@/features/users/api/organizationInvitesApi'

export function usePendingInvitesQuery() {
  const { activeOrg } = useOrg()
  return useQuery({
    queryKey: ['organization-invites', activeOrg?.id],
    queryFn: () => fetchPendingInvites(activeOrg!.id),
    enabled: !!activeOrg,
  })
}

export function useCreateOrganizationInvite() {
  const { activeOrg } = useOrg()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (input: OrganizationInviteInsert) => createOrganizationInvite(activeOrg!.id, user!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organization-invites', activeOrg?.id] })
    },
    onError: (error: Error) => showToast(error.message || 'No se pudo crear la invitación', 'error'),
  })
}

export function useRevokeOrganizationInvite() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (id: string) => revokeOrganizationInvite(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organization-invites', activeOrg?.id] })
      showToast('Invitación cancelada', 'success')
    },
    onError: () => showToast('No se pudo cancelar la invitación', 'error'),
  })
}
