import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

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
  status: string | null
  active: boolean | null
}

export interface DriverSort {
  column: DriverSortColumn
  direction: 'asc' | 'desc'
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

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
  if (filters.status) {
    query = query.eq('status', filters.status)
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
