import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import { applyFilters, type AppliedFilter } from '@/lib/queryFilters'
import type { DateRangeValue } from '@/lib/dateRanges'

export type MaintenanceRecord = Tables<'maintenance_records'>
export type MaintenanceRecordInsert = Omit<TablesInsert<'maintenance_records'>, 'organization_id'>
export type MaintenanceRecordUpdate = TablesUpdate<'maintenance_records'>

export interface MaintenanceRecordWithRelations extends MaintenanceRecord {
  vehicles: { economic_number: string; plate: string | null } | null
  maintenance_types: { name: string; interval_km: number | null; interval_days: number | null } | null
}

export const MAINTENANCE_RECORD_STATUSES = [
  { value: 'scheduled', label: 'Programado' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
] as const

export type MaintenanceRecordSortColumn = 'scheduled_date' | 'completed_date' | 'cost' | 'created_at'

export interface MaintenanceRecordFilters {
  search: string
  dateRange: DateRangeValue
  advanced: AppliedFilter[]
  groupBy: string | null
}

export interface MaintenanceRecordSort {
  column: MaintenanceRecordSortColumn
  direction: 'asc' | 'desc'
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

const MAINTENANCE_RECORD_SELECT = '*, vehicles(economic_number, plate), maintenance_types(name, interval_km, interval_days)'
const GROUPED_PAGE_SIZE = 300

export async function fetchMaintenanceRecords(
  organizationId: string,
  filters: MaintenanceRecordFilters,
  sort: MaintenanceRecordSort,
  page: number,
  pageSize: number,
): Promise<{ rows: MaintenanceRecordWithRelations[]; count: number }> {
  let query = supabase
    .from('maintenance_records')
    .select(MAINTENANCE_RECORD_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  const search = escapeIlikeTerm(filters.search)
  if (search) {
    query = query.ilike('provider', `%${search}%`)
  }
  if (filters.dateRange.from) query = query.gte('scheduled_date', filters.dateRange.from)
  if (filters.dateRange.to) query = query.lte('scheduled_date', filters.dateRange.to)

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
  return { rows: (data ?? []) as unknown as MaintenanceRecordWithRelations[], count: count ?? 0 }
}

export async function fetchMaintenanceRecordById(id: string): Promise<MaintenanceRecordWithRelations> {
  const { data, error } = await supabase.from('maintenance_records').select(MAINTENANCE_RECORD_SELECT).eq('id', id).single()
  if (error) throw error
  return data as unknown as MaintenanceRecordWithRelations
}

export async function createMaintenanceRecord(organizationId: string, input: MaintenanceRecordInsert): Promise<MaintenanceRecord> {
  const { data, error } = await supabase
    .from('maintenance_records')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMaintenanceRecord(id: string, input: MaintenanceRecordUpdate): Promise<MaintenanceRecord> {
  const { data, error } = await supabase.from('maintenance_records').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function softDeleteMaintenanceRecord(id: string): Promise<void> {
  const { error } = await supabase.from('maintenance_records').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
