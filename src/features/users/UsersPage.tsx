import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Can } from '@/components/Can'
import { formatDateTime } from '@/lib/format'
import { buildInviteLink, type OrganizationInviteWithRelations } from '@/features/users/api/organizationInvitesApi'
import { useOrganizationMembersQuery } from '@/features/users/hooks/useOrganizationMembers'
import { usePendingInvitesQuery, useRevokeOrganizationInvite } from '@/features/users/hooks/useOrganizationInvites'
import { InviteMemberDrawer } from '@/features/users/components/InviteMemberDrawer'
import { MemberEditDrawer } from '@/features/users/components/MemberEditDrawer'
import type { OrganizationMemberWithRelations } from '@/features/users/api/organizationMembersApi'
import { useToast } from '@/context/ToastContext'

const STATUS_LABEL: Record<string, string> = { active: 'Activo', suspended: 'Suspendido', invited: 'Invitado', removed: 'Eliminado' }
const STATUS_TONE: Record<string, string> = {
  active: 'bg-status-active-bg text-status-active',
  suspended: 'bg-status-delayed-bg text-status-delayed',
  invited: 'bg-status-progress-bg text-status-progress',
  removed: 'bg-gray-100 text-gray-500',
}

function InviteRow({ invite }: { invite: OrganizationInviteWithRelations }) {
  const revokeMutation = useRevokeOrganizationInvite()
  const { showToast } = useToast()

  return (
    <tr className="border-b border-gray-100">
      <td className="px-4 py-2 font-medium text-gray-900">{invite.email}</td>
      <td className="px-4 py-2 text-gray-700">{invite.roles?.name ?? '—'}</td>
      <td className="px-4 py-2 text-gray-500">{formatDateTime(invite.created_at)}</td>
      <td className="px-4 py-2 text-gray-500">{formatDateTime(invite.expires_at)}</td>
      <td className="px-4 py-2 text-right">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(buildInviteLink(invite.token))
              showToast('Enlace copiado', 'success')
            }}
            className="text-xs font-medium text-accent-600 hover:text-accent-700"
          >
            Copiar enlace
          </button>
          <button
            type="button"
            onClick={() => revokeMutation.mutate(invite.id)}
            disabled={revokeMutation.isPending}
            className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </td>
    </tr>
  )
}

export function UsersPage() {
  const membersQuery = useOrganizationMembersQuery()
  const invitesQuery = usePendingInvitesQuery()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<OrganizationMemberWithRelations | null>(null)

  const members = membersQuery.data ?? []
  const invites = invitesQuery.data ?? []

  return (
    <div className="flex h-full flex-col gap-4 p-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Usuarios</h1>
          <p className="text-sm text-gray-500">Miembros de tu organización y sus roles.</p>
        </div>
        <Can permission="users.manage">
          <Button onClick={() => setInviteOpen(true)}>Invitar usuario</Button>
        </Can>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-ink">Miembros</h2>
        </div>
        {membersQuery.isLoading && (
          <div className="p-4">
            <Skeleton className="h-32" />
          </div>
        )}
        {membersQuery.isError && <ErrorState message="No se pudieron cargar los miembros." onRetry={() => void membersQuery.refetch()} />}
        {!membersQuery.isLoading && !membersQuery.isError && members.length === 0 && (
          <EmptyState title="Sin miembros" description="Invita al primer usuario de tu organización." />
        )}
        {members.length > 0 && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Correo</th>
                <th className="px-4 py-2">Rol</th>
                <th className="px-4 py-2">Sucursal</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const name = [member.profiles?.first_name, member.profiles?.last_name].filter(Boolean).join(' ') || '—'
                return (
                  <tr key={member.id} onClick={() => setEditingMember(member)} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{name}</td>
                    <td className="px-4 py-2 text-gray-700">{member.profiles?.email ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{member.roles?.name ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{member.locations?.name ?? '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[member.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABEL[member.status] ?? member.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-ink">Invitaciones pendientes</h2>
        </div>
        {invitesQuery.isLoading && (
          <div className="p-4">
            <Skeleton className="h-16" />
          </div>
        )}
        {invites.length === 0 && !invitesQuery.isLoading && <p className="p-4 text-sm text-gray-400">Sin invitaciones pendientes.</p>}
        {invites.length > 0 && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2">Correo</th>
                <th className="px-4 py-2">Rol</th>
                <th className="px-4 py-2">Invitado</th>
                <th className="px-4 py-2">Expira</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <InviteRow key={invite.id} invite={invite} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <InviteMemberDrawer open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <MemberEditDrawer member={editingMember} onClose={() => setEditingMember(null)} />
    </div>
  )
}
