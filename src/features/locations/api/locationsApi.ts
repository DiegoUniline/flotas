import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import { applyFilters, type AppliedFilter } from '@/lib/queryFilters'
import type { DateRangeValue } from '@/lib/dateRanges'
import { offlineSyncKeys, searchWithOfflineFallback } from '@/lib/offlineCache'

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
  dateRange: DateRangeValue
  advanced: AppliedFilter[]
  groupBy: string | null
}

export interface LocationSort {
  column: LocationSortColumn
  direction: 'asc' | 'desc'
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

const GROUPED_PAGE_SIZE = 300

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
  if (filters.dateRange.from) query = query.gte('created_at', filters.dateRange.from)
  if (filters.dateRange.to) query = query.lte('created_at', `${filters.dateRange.to}T23:59:59`)

  query = applyFilters(query, filters.advanced)

  const effectivePageSize = filters.groupBy ? GROUPED_PAGE_SIZE : pageSize
  const effectivePage = filters.groupBy ? 0 : page
  const from = effectivePage * effectivePageSize
  const to = from + effectivePageSize - 1

  const orderColumn = filters.groupBy ?? sort.column
  query = query.order(orderColumn, { ascending: true }).range(from, to)
  if (filters.groupBy) {
    query = query.order(sort.column, { ascending: sort.direction === 'asc' })
  }

  const { data, error, count } = await query
  if (error) throw error
  return { rows: data ?? [], count: count ?? 0 }
}

export async function fetchLocationById(id: string): Promise<Location> {
  const { data, error } = await supabase.from('locations').select('*').eq('id', id).single()
  if (error) throw error
  return data
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

export interface LocationOption {
  id: string
  name: string
}

export async function fetchLocationOptions(organizationId: string): Promise<LocationOption[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('active', true)
    .is('deleted_at', null)
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function searchLocations(organizationId: string, query: string): Promise<LocationOption[]> {
  return searchWithOfflineFallback(
    offlineSyncKeys.locations(organizationId),
    (item: LocationOption, term) => item.name.toLowerCase().includes(term),
    async () => {
      let q = supabase
        .from('locations')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('active', true)
        .is('deleted_at', null)

      if (query.trim()) q = q.ilike('name', `%${query.trim()}%`)

      const { data, error } = await q.order('name', { ascending: true }).limit(20)
      if (error) throw error
      return data ?? []
    },
    query,
  )
}

export async function softDeleteLocation(id: string): Promise<void> {
  const { error } = await supabase
    .from('locations')
    .update({ deleted_at: new Date().toISOString(), active: false })
    .eq('id', id)
  if (error) throw error
}
