import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type DriverLicense = Tables<'driver_licenses'>
export type DriverLicenseInsert = Omit<TablesInsert<'driver_licenses'>, 'organization_id' | 'driver_id'>
export type DriverLicenseUpdate = TablesUpdate<'driver_licenses'>

export const LICENSE_STATUSES = [
  { value: 'valid', label: 'Vigente' },
  { value: 'expired', label: 'Vencida' },
  { value: 'suspended', label: 'Suspendida' },
] as const

export async function fetchDriverLicenses(driverId: string): Promise<DriverLicense[]> {
  const { data, error } = await supabase
    .from('driver_licenses')
    .select('*')
    .eq('driver_id', driverId)
    .order('expires_at', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

export async function createDriverLicense(
  organizationId: string,
  driverId: string,
  input: DriverLicenseInsert,
): Promise<DriverLicense> {
  const { data, error } = await supabase
    .from('driver_licenses')
    .insert({ ...input, organization_id: organizationId, driver_id: driverId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDriverLicense(id: string, input: DriverLicenseUpdate): Promise<DriverLicense> {
  const { data, error } = await supabase.from('driver_licenses').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteDriverLicense(id: string): Promise<void> {
  const { error } = await supabase.from('driver_licenses').delete().eq('id', id)
  if (error) throw error
}
