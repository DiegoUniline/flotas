import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type DriverCertification = Tables<'driver_certifications'>
export type DriverCertificationInsert = Omit<TablesInsert<'driver_certifications'>, 'organization_id' | 'driver_id'>
export type DriverCertificationUpdate = TablesUpdate<'driver_certifications'>

export const CERTIFICATION_STATUSES = [
  { value: 'valid', label: 'Vigente' },
  { value: 'expired', label: 'Vencida' },
] as const

export async function fetchDriverCertifications(driverId: string): Promise<DriverCertification[]> {
  const { data, error } = await supabase
    .from('driver_certifications')
    .select('*')
    .eq('driver_id', driverId)
    .order('expires_at', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

export async function createDriverCertification(
  organizationId: string,
  driverId: string,
  input: DriverCertificationInsert,
): Promise<DriverCertification> {
  const { data, error } = await supabase
    .from('driver_certifications')
    .insert({ ...input, organization_id: organizationId, driver_id: driverId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDriverCertification(
  id: string,
  input: DriverCertificationUpdate,
): Promise<DriverCertification> {
  const { data, error } = await supabase.from('driver_certifications').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteDriverCertification(id: string): Promise<void> {
  const { error } = await supabase.from('driver_certifications').delete().eq('id', id)
  if (error) throw error
}
