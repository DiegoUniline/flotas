import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import { applyFilters, type AppliedFilter } from '@/lib/queryFilters'
import type { DateRangeValue } from '@/lib/dateRanges'

export type FuelLog = Tables<'fuel_logs'>
export type FuelLogInsert = Omit<TablesInsert<'fuel_logs'>, 'organization_id'>
export type FuelLogUpdate = TablesUpdate<'fuel_logs'>

export interface FuelLogWithRelations extends FuelLog {
  vehicles: { economic_number: string; plate: string | null } | null
  drivers: { first_name: string; last_name: string } | null
  fuel_stations: { name: string } | null
  fuel_types: { name: string } | null
}

export type FuelLogSortColumn = 'logged_at' | 'total_cost' | 'liters' | 'created_at'

export interface FuelLogFilters {
  search: string
  dateRange: DateRangeValue
  advanced: AppliedFilter[]
  groupBy: string | null
}

export interface FuelLogSort {
  column: FuelLogSortColumn
  direction: 'asc' | 'desc'
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

const FUEL_LOG_SELECT = '*, vehicles(economic_number, plate), drivers(first_name, last_name), fuel_stations(name), fuel_types(name)'
const GROUPED_PAGE_SIZE = 300

export async function fetchFuelLogs(
  organizationId: string,
  filters: FuelLogFilters,
  sort: FuelLogSort,
  page: number,
  pageSize: number,
): Promise<{ rows: FuelLogWithRelations[]; count: number }> {
  let query = supabase
    .from('fuel_logs')
    .select(FUEL_LOG_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  const search = escapeIlikeTerm(filters.search)
  if (search) {
    query = query.ilike('notes', `%${search}%`)
  }
  if (filters.dateRange.from) query = query.gte('logged_at', filters.dateRange.from)
  if (filters.dateRange.to) query = query.lte('logged_at', `${filters.dateRange.to}T23:59:59`)

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
  return { rows: (data ?? []) as unknown as FuelLogWithRelations[], count: count ?? 0 }
}

export async function fetchFuelLogById(id: string): Promise<FuelLogWithRelations> {
  const { data, error } = await supabase.from('fuel_logs').select(FUEL_LOG_SELECT).eq('id', id).single()
  if (error) throw error
  return data as unknown as FuelLogWithRelations
}

export async function createFuelLog(organizationId: string, input: FuelLogInsert): Promise<FuelLog> {
  const { data, error } = await supabase
    .from('fuel_logs')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFuelLog(id: string, input: FuelLogUpdate): Promise<FuelLog> {
  const { data, error } = await supabase.from('fuel_logs').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function softDeleteFuelLog(id: string): Promise<void> {
  const { error } = await supabase.from('fuel_logs').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
