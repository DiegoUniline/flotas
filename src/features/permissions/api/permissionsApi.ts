import { supabase } from '@/lib/supabase'

interface MembershipPermissionsRow {
  roles: {
    role_permissions: { permissions: { key: string } | null }[]
  } | null
}

export async function fetchPermissionKeys(organizationId: string, userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('roles(role_permissions(permissions(key)))')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle<MembershipPermissionsRow>()

  if (error) throw error
  if (!data?.roles) return []

  return data.roles.role_permissions
    .map((entry) => entry.permissions?.key)
    .filter((key): key is string => Boolean(key))
}
