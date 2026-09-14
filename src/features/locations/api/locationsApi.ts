import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type Location = Tables<'locations'>
export type LocationInsert = Omit<TablesInsert<'locations'>, 'organization_id'>
export type LocationUpdate = TablesUpdate<'locations'>

export const LOCATION_TYPES = [
  { value: 'branch', label: 'Sucursal' },
  { value: 'warehouse', label: 'Almacén' },
  { value: 'workshop', label: 'Taller' },
  { value: 'office', label: 'Oficina' },
] as const

export type LocationSortColumn = 'name' | 'code' | 'city' | 'created_at'

export interface LocationFilters {
  search: string
  locationType: string | null
  active: boolean | null
}

export interface LocationSort {
  column: LocationSortColumn
  direction: 'asc' | 'desc'
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

export async function fetchLocations(
  organizationId: string,
  filters: LocationFilters,
  sort: LocationSort,
  page: number,
  pageSize: number,
): Promise<{ rows: Location[]; count: number }> {
  let query = supabase
    .from('locations')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  const search = escapeIlikeTerm(filters.search)
  if (search) {
    query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
  }
  if (filters.locationType) {
    query = query.eq('location_type', filters.locationType)
  }
  if (filters.active !== null) {
    query = query.eq('active', filters.active)
  }

  const from = page * pageSize
  const to = from + pageSize - 1
  query = query.order(sort.column, { ascending: sort.direction === 'asc' }).range(from, to)

  const { data, error, count } = await query
  if (error) throw error
  return { rows: data ?? [], count: count ?? 0 }
}

export async function createLocation(organizationId: string, input: LocationInsert): Promise<Location> {
  const { data, error } = await supabase
    .from('locations')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateLocation(id: string, input: LocationUpdate): Promise<Location> {
  const { data, error } = await supabase.from('locations').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function softDeleteLocation(id: string): Promise<void> {
  const { error } = await supabase
    .from('locations')
    .update({ deleted_at: new Date().toISOString(), active: false })
    .eq('id', id)
  if (error) throw error
}
