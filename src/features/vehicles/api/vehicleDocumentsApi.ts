import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type VehicleDocument = Tables<'entity_documents'>
export type VehicleDocumentInsert = Omit<TablesInsert<'entity_documents'>, 'organization_id' | 'entity_type' | 'entity_id'>
export type VehicleDocumentUpdate = TablesUpdate<'entity_documents'>

export const VEHICLE_DOCUMENT_TYPES = [
  { value: 'insurance', label: 'Seguro' },
  { value: 'circulation_card', label: 'Tarjeta de circulación' },
  { value: 'verification', label: 'Verificación' },
  { value: 'permit', label: 'Permiso' },
  { value: 'other', label: 'Otro' },
] as const

export const DOCUMENT_STATUSES = [
  { value: 'valid', label: 'Vigente' },
  { value: 'expired', label: 'Vencido' },
] as const

const ENTITY_TYPE = 'vehicle'

export async function fetchVehicleDocuments(vehicleId: string): Promise<VehicleDocument[]> {
  const { data, error } = await supabase
    .from('entity_documents')
    .select('*')
    .eq('entity_type', ENTITY_TYPE)
    .eq('entity_id', vehicleId)
    .order('expires_at', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

export async function createVehicleDocument(
  organizationId: string,
  vehicleId: string,
  input: VehicleDocumentInsert,
): Promise<VehicleDocument> {
  const { data, error } = await supabase
    .from('entity_documents')
    .insert({ ...input, organization_id: organizationId, entity_type: ENTITY_TYPE, entity_id: vehicleId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateVehicleDocument(id: string, input: VehicleDocumentUpdate): Promise<VehicleDocument> {
  const { data, error } = await supabase.from('entity_documents').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteVehicleDocument(id: string): Promise<void> {
  const { error } = await supabase.from('entity_documents').delete().eq('id', id)
  if (error) throw error
}
