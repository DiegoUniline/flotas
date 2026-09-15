import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/types/database'

export type OrganizationInvite = Tables<'organization_invites'>
export type OrganizationInviteInsert = Omit<TablesInsert<'organization_invites'>, 'organization_id' | 'invited_by' | 'token' | 'status'>

export interface OrganizationInviteWithRelations extends OrganizationInvite {
  roles: { name: string } | null
}

const SELECT = '*, roles(name)'

export async function fetchPendingInvites(organizationId: string): Promise<OrganizationInviteWithRelations[]> {
  const { data, error } = await supabase
    .from('organization_invites')
    .select(SELECT)
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as OrganizationInviteWithRelations[]
}

export async function createOrganizationInvite(
  organizationId: string,
  userId: string,
  input: OrganizationInviteInsert,
): Promise<OrganizationInvite> {
  const { data, error } = await supabase
    .from('organization_invites')
    .insert({ ...input, organization_id: organizationId, invited_by: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function revokeOrganizationInvite(id: string): Promise<void> {
  const { error } = await supabase.from('organization_invites').update({ status: 'revoked' }).eq('id', id)
  if (error) throw error
}

export function buildInviteLink(token: string): string {
  return `${window.location.origin}/invitacion/${token}`
}
