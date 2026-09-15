import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database'

export type OrganizationMember = Tables<'organization_members'>
export type OrganizationMemberUpdate = TablesUpdate<'organization_members'>

export interface OrganizationMemberWithRelations extends OrganizationMember {
  profiles: { first_name: string | null; last_name: string | null; email: string | null } | null
  roles: { id: string; name: string } | null
  locations: { name: string } | null
}

const SELECT = '*, profiles(first_name, last_name, email), roles(id, name), locations(name)'

export async function fetchOrganizationMembers(organizationId: string): Promise<OrganizationMemberWithRelations[]> {
  const { data, error } = await supabase
    .from('organization_members')
    .select(SELECT)
    .eq('organization_id', organizationId)
    .neq('status', 'removed')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as OrganizationMemberWithRelations[]
}

export async function updateOrganizationMember(id: string, input: OrganizationMemberUpdate): Promise<OrganizationMember> {
  const { data, error } = await supabase.from('organization_members').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function removeOrganizationMember(id: string): Promise<void> {
  const { error } = await supabase.from('organization_members').update({ status: 'removed' }).eq('id', id)
  if (error) throw error
}
