import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import { applyFilters, type AppliedFilter } from '@/lib/queryFilters'
import type { DateRangeValue } from '@/lib/dateRanges'
import { offlineSyncKeys, searchWithOfflineFallback } from '@/lib/offlineCache'

export type Driver = Tables<'drivers'>
export type DriverInsert = Omit<TablesInsert<'drivers'>, 'organization_id'>
export type DriverUpdate = TablesUpdate<'drivers'>

export const DRIVER_STATUSES = [
  { value: 'active', label: 'Activo' },
  { value: 'on_leave', label: 'De permiso' },
  { value: 'suspended', label: 'Suspendido' },
  { value: 'inactive', label: 'Inactivo' },
] as const

export type DriverSortColumn = 'first_name' | 'employee_number' | 'created_at'

export interface DriverFilters {
  search: string
  dateRange: DateRangeValue
  advanced: AppliedFilter[]
  groupBy: string | null
}

export interface DriverSort {
  column: DriverSortColumn
  direction: 'asc' | 'desc'
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

const GROUPED_PAGE_SIZE = 300

export async function fetchDrivers(
  organizationId: string,
  filters: DriverFilters,
  sort: DriverSort,
  page: number,
  pageSize: number,
): Promise<{ rows: Driver[]; count: number }> {
  let query = supabase
    .from('drivers')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  const search = escapeIlikeTerm(filters.search)
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,employee_number.ilike.%${search}%,phone.ilike.%${search}%`,
    )
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

export async function createDriver(organizationId: string, input: DriverInsert): Promise<Driver> {
  const { data, error } = await supabase
    .from('drivers')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDriver(id: string, input: DriverUpdate): Promise<Driver> {
  const { data, error } = await supabase.from('drivers').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function softDeleteDriver(id: string): Promise<void> {
  const { error } = await supabase
    .from('drivers')
    .update({ deleted_at: new Date().toISOString(), active: false })
    .eq('id', id)
  if (error) throw error
}

export interface DriverOption {
  id: string
  first_name: string
  last_name: string
}

export async function fetchDriverOptions(organizationId: string): Promise<DriverOption[]> {
  const { data, error } = await supabase
    .from('drivers')
    .select('id, first_name, last_name')
    .eq('organization_id', organizationId)
    .eq('active', true)
    .is('deleted_at', null)
    .order('first_name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function searchDrivers(organizationId: string, query: string): Promise<DriverOption[]> {
  return searchWithOfflineFallback(
    offlineSyncKeys.drivers(organizationId),
    (item: DriverOption, term) => `${item.first_name} ${item.last_name}`.toLowerCase().includes(term),
    async () => {
      let q = supabase
        .from('drivers')
        .select('id, first_name, last_name')
        .eq('organization_id', organizationId)
        .eq('active', true)
        .is('deleted_at', null)

      const term = query.trim()
      if (term) q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)

      const { data, error } = await q.order('first_name', { ascending: true }).limit(20)
      if (error) throw error
      return data ?? []
    },
    query,
  )
}
