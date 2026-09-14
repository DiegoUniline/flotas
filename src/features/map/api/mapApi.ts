import { supabase } from '@/lib/supabase'

export interface MappedLocation {
  id: string
  name: string
  code: string | null
  location_type: string
  city: string | null
  latitude: number
  longitude: number
}

export async function fetchMappedLocations(organizationId: string): Promise<MappedLocation[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('id, name, code, location_type, city, latitude, longitude')
    .eq('organization_id', organizationId)
    .eq('active', true)
    .is('deleted_at', null)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)

  if (error) throw error

  return (data ?? []).filter(
    (row): row is MappedLocation => row.latitude !== null && row.longitude !== null,
  )
}

export async function countLocations(organizationId: string): Promise<{ total: number; active: number }> {
  const [totalResult, activeResult] = await Promise.all([
    supabase
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .is('deleted_at', null),
    supabase
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('active', true)
      .is('deleted_at', null),
  ])

  if (totalResult.error) throw totalResult.error
  if (activeResult.error) throw activeResult.error

  return { total: totalResult.count ?? 0, active: activeResult.count ?? 0 }
}
