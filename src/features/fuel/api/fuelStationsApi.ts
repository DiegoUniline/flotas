import { supabase } from '@/lib/supabase'

export interface FuelStationOption {
  id: string
  name: string
}

export async function searchFuelStations(organizationId: string, query: string): Promise<FuelStationOption[]> {
  let q = supabase.from('fuel_stations').select('id, name').eq('organization_id', organizationId).eq('active', true).is('deleted_at', null)
  if (query.trim()) q = q.ilike('name', `%${query.trim()}%`)
  const { data, error } = await q.order('name', { ascending: true }).limit(20)
  if (error) throw error
  return data ?? []
}

export async function createFuelStation(organizationId: string, name: string): Promise<FuelStationOption> {
  const { data, error } = await supabase.from('fuel_stations').insert({ organization_id: organizationId, name }).select('id, name').single()
  if (error) throw error
  return data
}
