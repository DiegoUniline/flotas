import { supabase } from '@/lib/supabase'

export interface InvitePublicInfo {
  organization_name: string
  role_name: string
  email: string
  status: string
  expires_at: string
}

export async function getInviteByToken(token: string): Promise<InvitePublicInfo | null> {
  const { data, error } = await supabase.rpc('get_invite_by_token', { p_token: token })
  if (error) throw error
  return (data as InvitePublicInfo[] | null)?.[0] ?? null
}

export async function acceptOrganizationInvite(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_organization_invite', { p_token: token })
  if (error) throw error
  return data as string
}
