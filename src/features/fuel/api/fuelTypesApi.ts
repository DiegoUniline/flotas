import { supabase } from '@/lib/supabase'

export interface FuelTypeOption {
  id: string
  name: string
}

export async function searchFuelTypes(organizationId: string, query: string): Promise<FuelTypeOption[]> {
  let q = supabase
    .from('fuel_types')
    .select('id, name')
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .eq('active', true)

  if (query.trim()) q = q.ilike('name', `%${query.trim()}%`)
  const { data, error } = await q.order('name', { ascending: true }).limit(20)
  if (error) throw error
  return data ?? []
}

export async function createFuelType(organizationId: string, name: string): Promise<FuelTypeOption> {
  const { data, error } = await supabase.from('fuel_types').insert({ organization_id: organizationId, name }).select('id, name').single()
  if (error) throw error
  return data
}
