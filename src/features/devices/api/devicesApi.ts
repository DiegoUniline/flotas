import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import { applyFilters, type AppliedFilter } from '@/lib/queryFilters'
import type { DateRangeValue } from '@/lib/dateRanges'

export type Device = Tables<'devices'>
export type DeviceInsert = Omit<TablesInsert<'devices'>, 'organization_id'>
export type DeviceUpdate = TablesUpdate<'devices'>

export interface DeviceWithRelations extends Device {
  vehicles: { economic_number: string; plate: string | null } | null
}

/** Texto libre, no enum de Postgres — mismo criterio que `vehicles.status`. */
export const DEVICE_TYPES = [
  { value: 'gps_tracker', label: 'Rastreador GPS' },
  { value: 'dashcam', label: 'Dashcam' },
  { value: 'fuel_sensor', label: 'Sensor de combustible' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'other', label: 'Otro' },
] as const

export const DEVICE_STATUSES = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'maintenance', label: 'En mantenimiento' },
  { value: 'lost', label: 'Perdido/robado' },
] as const

export type DeviceSortColumn = 'name' | 'device_type' | 'status' | 'created_at'

export interface DeviceFilters {
  search: string
  dateRange: DateRangeValue
  advanced: AppliedFilter[]
  groupBy: string | null
}

export interface DeviceSort {
  column: DeviceSortColumn
  direction: 'asc' | 'desc'
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

const DEVICE_SELECT = '*, vehicles(economic_number, plate)'
const GROUPED_PAGE_SIZE = 300

export async function fetchDevices(
  organizationId: string,
  filters: DeviceFilters,
  sort: DeviceSort,
  page: number,
  pageSize: number,
): Promise<{ rows: DeviceWithRelations[]; count: number }> {
  let query = supabase
    .from('devices')
    .select(DEVICE_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  const search = escapeIlikeTerm(filters.search)
  if (search) {
    query = query.or(`name.ilike.%${search}%,serial_number.ilike.%${search}%`)
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
  return { rows: (data ?? []) as unknown as DeviceWithRelations[], count: count ?? 0 }
}

export async function fetchDeviceById(id: string): Promise<DeviceWithRelations> {
  const { data, error } = await supabase.from('devices').select(DEVICE_SELECT).eq('id', id).single()
  if (error) throw error
  return data as unknown as DeviceWithRelations
}

export async function createDevice(organizationId: string, input: DeviceInsert): Promise<Device> {
  const { data, error } = await supabase
    .from('devices')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDevice(id: string, input: DeviceUpdate): Promise<Device> {
  const { data, error } = await supabase.from('devices').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function softDeleteDevice(id: string): Promise<void> {
  const { error } = await supabase.from('devices').update({ deleted_at: new Date().toISOString(), active: false }).eq('id', id)
  if (error) throw error
}
