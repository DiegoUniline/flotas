import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type Role = Tables<'roles'>
export type RoleInsert = Omit<TablesInsert<'roles'>, 'organization_id'>
export type RoleUpdate = TablesUpdate<'roles'>

export async function fetchRoles(organizationId: string): Promise<Role[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .eq('active', true)
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function fetchRoleById(id: string): Promise<Role> {
  const { data, error } = await supabase.from('roles').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export interface RoleOption {
  id: string
  name: string
}

export async function searchRoles(organizationId: string, query: string): Promise<RoleOption[]> {
  let q = supabase
    .from('roles')
    .select('id, name')
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .eq('active', true)
  if (query.trim()) q = q.ilike('name', `%${query.trim()}%`)
  const { data, error } = await q.order('name', { ascending: true }).limit(20)
  if (error) throw error
  return data ?? []
}

export async function createRole(organizationId: string, input: RoleInsert): Promise<Role> {
  const { data, error } = await supabase
    .from('roles')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRole(id: string, input: RoleUpdate): Promise<Role> {
  const { data, error } = await supabase.from('roles').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export interface PermissionRow {
  id: string
  key: string
  module: string
  description: string | null
}

export async function fetchAllPermissions(): Promise<PermissionRow[]> {
  const { data, error } = await supabase.from('permissions').select('id, key, module, description').order('module').order('key')
  if (error) throw error
  return data ?? []
}

export async function fetchRolePermissionIds(roleId: string): Promise<string[]> {
  const { data, error } = await supabase.from('role_permissions').select('permission_id').eq('role_id', roleId)
  if (error) throw error
  return (data ?? []).map((r) => r.permission_id)
}

export async function setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
  const { data: existing, error: fetchError } = await supabase.from('role_permissions').select('permission_id').eq('role_id', roleId)
  if (fetchError) throw fetchError
  const existingIds = new Set((existing ?? []).map((r) => r.permission_id))
  const nextIds = new Set(permissionIds)

  const toAdd = permissionIds.filter((id) => !existingIds.has(id))
  const toRemove = [...existingIds].filter((id) => !nextIds.has(id))

  if (toAdd.length > 0) {
    const { error } = await supabase.from('role_permissions').insert(toAdd.map((permission_id) => ({ role_id: roleId, permission_id })))
    if (error) throw error
  }
  if (toRemove.length > 0) {
    const { error } = await supabase.from('role_permissions').delete().eq('role_id', roleId).in('permission_id', toRemove)
    if (error) throw error
  }
}

/** Crea un rol personalizado de la organización copiando el nombre/descripción
 * y el set de permisos de un rol de sistema (los roles de sistema son
 * de solo lectura por RLS — esta es la forma de partir de uno). */
export async function duplicateRoleAsCustom(organizationId: string, sourceRole: Role): Promise<Role> {
  const created = await createRole(organizationId, {
    name: `${sourceRole.name} (personalizado)`,
    description: sourceRole.description,
    key: null,
    system_role: false,
    active: true,
  })
  const sourcePermissionIds = await fetchRolePermissionIds(sourceRole.id)
  if (sourcePermissionIds.length > 0) {
    await setRolePermissions(created.id, sourcePermissionIds)
  }
  return created
}
