import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import { applyFilters, type AppliedFilter } from '@/lib/queryFilters'
import type { DateRangeValue } from '@/lib/dateRanges'

export type Geofence = Tables<'geofences'>
export type GeofenceInsert = Omit<TablesInsert<'geofences'>, 'organization_id'>
export type GeofenceUpdate = TablesUpdate<'geofences'>

export interface GeofenceWithRelations extends Geofence {
  locations: { name: string } | null
}

export const GEOFENCE_COLORS = [
  { value: '#f97316', label: 'Naranja' },
  { value: '#16a34a', label: 'Verde' },
  { value: '#6366f1', label: 'Índigo' },
  { value: '#dc2626', label: 'Rojo' },
  { value: '#0ea5e9', label: 'Celeste' },
] as const

export type GeofenceSortColumn = 'name' | 'radius_meters' | 'created_at'

export interface GeofenceFilters {
  search: string
  dateRange: DateRangeValue
  advanced: AppliedFilter[]
  groupBy: string | null
}

export interface GeofenceSort {
  column: GeofenceSortColumn
  direction: 'asc' | 'desc'
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

const GEOFENCE_SELECT = '*, locations(name)'
const GROUPED_PAGE_SIZE = 300

export async function fetchGeofences(
  organizationId: string,
  filters: GeofenceFilters,
  sort: GeofenceSort,
  page: number,
  pageSize: number,
): Promise<{ rows: GeofenceWithRelations[]; count: number }> {
  let query = supabase
    .from('geofences')
    .select(GEOFENCE_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  const search = escapeIlikeTerm(filters.search)
  if (search) {
    query = query.ilike('name', `%${search}%`)
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
  return { rows: (data ?? []) as unknown as GeofenceWithRelations[], count: count ?? 0 }
}

export async function fetchGeofenceById(id: string): Promise<GeofenceWithRelations> {
  const { data, error } = await supabase.from('geofences').select(GEOFENCE_SELECT).eq('id', id).single()
  if (error) throw error
  return data as unknown as GeofenceWithRelations
}

export async function createGeofence(organizationId: string, input: GeofenceInsert): Promise<Geofence> {
  const { data, error } = await supabase
    .from('geofences')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateGeofence(id: string, input: GeofenceUpdate): Promise<Geofence> {
  const { data, error } = await supabase.from('geofences').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function softDeleteGeofence(id: string): Promise<void> {
  const { error } = await supabase
    .from('geofences')
    .update({ deleted_at: new Date().toISOString(), active: false })
    .eq('id', id)
  if (error) throw error
}
