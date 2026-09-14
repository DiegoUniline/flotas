import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type MaintenanceType = Tables<'maintenance_types'>
export type MaintenanceTypeInsert = Omit<TablesInsert<'maintenance_types'>, 'organization_id'>
export type MaintenanceTypeUpdate = TablesUpdate<'maintenance_types'>

export const MAINTENANCE_CATEGORIES = [
  { value: 'preventive', label: 'Preventivo' },
  { value: 'corrective', label: 'Correctivo' },
] as const

export async function fetchMaintenanceTypes(organizationId: string): Promise<MaintenanceType[]> {
  const { data, error } = await supabase
    .from('maintenance_types')
    .select('*')
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .is('deleted_at', null)
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function fetchMaintenanceTypeById(id: string): Promise<MaintenanceType> {
  const { data, error } = await supabase.from('maintenance_types').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export interface MaintenanceTypeOption {
  id: string
  name: string
  interval_km: number | null
  interval_days: number | null
}

export async function searchMaintenanceTypes(organizationId: string, query: string): Promise<MaintenanceTypeOption[]> {
  let q = supabase
    .from('maintenance_types')
    .select('id, name, interval_km, interval_days')
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .eq('active', true)
    .is('deleted_at', null)

  if (query.trim()) q = q.ilike('name', `%${query.trim()}%`)
  const { data, error } = await q.order('name', { ascending: true }).limit(20)
  if (error) throw error
  return data ?? []
}

export async function createMaintenanceType(organizationId: string, input: MaintenanceTypeInsert): Promise<MaintenanceType> {
  const { data, error } = await supabase
    .from('maintenance_types')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMaintenanceType(id: string, input: MaintenanceTypeUpdate): Promise<MaintenanceType> {
  const { data, error } = await supabase.from('maintenance_types').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function softDeleteMaintenanceType(id: string): Promise<void> {
  const { error } = await supabase.from('maintenance_types').update({ deleted_at: new Date().toISOString(), active: false }).eq('id', id)
  if (error) throw error
}
