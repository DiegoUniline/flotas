import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import { applyFilters, type AppliedFilter } from '@/lib/queryFilters'
import type { DateRangeValue } from '@/lib/dateRanges'

export type Vehicle = Tables<'vehicles'>
export type VehicleInsert = Omit<TablesInsert<'vehicles'>, 'organization_id'>
export type VehicleUpdate = TablesUpdate<'vehicles'>

export interface VehicleWithRelations extends Vehicle {
  vehicle_types: { name: string } | null
  vehicle_groups: { name: string } | null
  drivers: { first_name: string; last_name: string } | null
  locations: { name: string } | null
}

export const VEHICLE_STATUSES = [
  { value: 'available', label: 'Disponible' },
  { value: 'assigned', label: 'Asignado' },
  { value: 'in_route', label: 'En ruta' },
  { value: 'maintenance', label: 'En mantenimiento' },
  { value: 'out_of_service', label: 'Fuera de servicio' },
  { value: 'inactive', label: 'Inactivo' },
] as const

export type VehicleSortColumn = 'economic_number' | 'plate' | 'brand' | 'created_at'

export interface VehicleFilters {
  search: string
  dateRange: DateRangeValue
  advanced: AppliedFilter[]
  groupBy: string | null
}

export interface VehicleSort {
  column: VehicleSortColumn
  direction: 'asc' | 'desc'
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

const VEHICLE_SELECT_WITH_RELATIONS =
  '*, vehicle_types(name), vehicle_groups(name), drivers!vehicles_assigned_driver_id_fkey(first_name, last_name), locations(name)'

/** Tamaño de página normal; cuando hay agrupación se trae un lote más grande
 * para que los grupos no queden cortados a la mitad entre páginas. */
const GROUPED_PAGE_SIZE = 300

export async function fetchVehicles(
  organizationId: string,
  filters: VehicleFilters,
  sort: VehicleSort,
  page: number,
  pageSize: number,
): Promise<{ rows: VehicleWithRelations[]; count: number }> {
  let query = supabase
    .from('vehicles')
    .select(VEHICLE_SELECT_WITH_RELATIONS, { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  const search = escapeIlikeTerm(filters.search)
  if (search) {
    query = query.or(`economic_number.ilike.%${search}%,plate.ilike.%${search}%,brand.ilike.%${search}%`)
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
  return { rows: (data ?? []) as unknown as VehicleWithRelations[], count: count ?? 0 }
}

export async function fetchVehicleById(id: string): Promise<VehicleWithRelations> {
  const { data, error } = await supabase.from('vehicles').select(VEHICLE_SELECT_WITH_RELATIONS).eq('id', id).single()
  if (error) throw error
  return data as unknown as VehicleWithRelations
}

export async function createVehicle(organizationId: string, input: VehicleInsert): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateVehicle(id: string, input: VehicleUpdate): Promise<Vehicle> {
  const { data, error } = await supabase.from('vehicles').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function softDeleteVehicle(id: string): Promise<void> {
  const { error } = await supabase
    .from('vehicles')
    .update({ deleted_at: new Date().toISOString(), active: false })
    .eq('id', id)
  if (error) throw error
}

export interface VehicleTypeOption {
  id: string
  name: string
}

export async function fetchVehicleTypeOptions(organizationId: string): Promise<VehicleTypeOption[]> {
  const { data, error } = await supabase
    .from('vehicle_types')
    .select('id, name')
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .eq('active', true)
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function searchVehicleTypes(organizationId: string, query: string): Promise<VehicleTypeOption[]> {
  let q = supabase
    .from('vehicle_types')
    .select('id, name')
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .eq('active', true)

  if (query.trim()) q = q.ilike('name', `%${query.trim()}%`)
  const { data, error } = await q.order('name', { ascending: true }).limit(20)
  if (error) throw error
  return data ?? []
}

export async function createVehicleType(organizationId: string, name: string): Promise<VehicleTypeOption> {
  const { data, error } = await supabase
    .from('vehicle_types')
    .insert({ organization_id: organizationId, name })
    .select('id, name')
    .single()
  if (error) throw error
  return data
}

export interface VehicleGroupOption {
  id: string
  name: string
}

export async function fetchVehicleGroupOptions(organizationId: string): Promise<VehicleGroupOption[]> {
  const { data, error } = await supabase
    .from('vehicle_groups')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('active', true)
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function searchVehicleGroups(organizationId: string, query: string): Promise<VehicleGroupOption[]> {
  let q = supabase.from('vehicle_groups').select('id, name').eq('organization_id', organizationId).eq('active', true)
  if (query.trim()) q = q.ilike('name', `%${query.trim()}%`)
  const { data, error } = await q.order('name', { ascending: true }).limit(20)
  if (error) throw error
  return data ?? []
}

export async function createVehicleGroup(organizationId: string, name: string): Promise<VehicleGroupOption> {
  const { data, error } = await supabase
    .from('vehicle_groups')
    .insert({ organization_id: organizationId, name })
    .select('id, name')
    .single()
  if (error) throw error
  return data
}

export interface VehicleOption {
  id: string
  economic_number: string | null
  plate: string | null
}

export async function fetchVehicleOptions(organizationId: string): Promise<VehicleOption[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, economic_number, plate')
    .eq('organization_id', organizationId)
    .eq('active', true)
    .is('deleted_at', null)
    .order('economic_number', { ascending: true })
  if (error) throw error
  return data ?? []
}
