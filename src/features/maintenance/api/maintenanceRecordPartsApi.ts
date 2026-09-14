import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type MaintenanceRecordPart = Tables<'maintenance_record_parts'>
export type MaintenanceRecordPartInsert = Omit<TablesInsert<'maintenance_record_parts'>, 'organization_id' | 'maintenance_record_id'>
export type MaintenanceRecordPartUpdate = TablesUpdate<'maintenance_record_parts'>

export interface MaintenanceRecordPartWithRelations extends MaintenanceRecordPart {
  parts: { name: string; unit: string } | null
}

const SELECT = '*, parts(name, unit)'

export async function fetchMaintenanceRecordParts(maintenanceRecordId: string): Promise<MaintenanceRecordPartWithRelations[]> {
  const { data, error } = await supabase
    .from('maintenance_record_parts')
    .select(SELECT)
    .eq('maintenance_record_id', maintenanceRecordId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as MaintenanceRecordPartWithRelations[]
}

export async function createMaintenanceRecordPart(
  organizationId: string,
  maintenanceRecordId: string,
  input: MaintenanceRecordPartInsert,
): Promise<MaintenanceRecordPart> {
  const { data, error } = await supabase
    .from('maintenance_record_parts')
    .insert({ ...input, organization_id: organizationId, maintenance_record_id: maintenanceRecordId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMaintenanceRecordPart(id: string, input: MaintenanceRecordPartUpdate): Promise<MaintenanceRecordPart> {
  const { data, error } = await supabase.from('maintenance_record_parts').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteMaintenanceRecordPart(id: string): Promise<void> {
  const { error } = await supabase.from('maintenance_record_parts').delete().eq('id', id)
  if (error) throw error
}
