import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type Vehicle = Tables<'vehicles'>
export type VehicleInsert = Omit<TablesInsert<'vehicles'>, 'organization_id'>
export type VehicleUpdate = TablesUpdate<'vehicles'>

export const VEHICLE_TYPES = [
  { value: 'truck', label: 'Camión' },
  { value: 'van', label: 'Van' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'car', label: 'Automóvil' },
  { value: 'trailer', label: 'Remolque' },
  { value: 'other', label: 'Otro' },
] as const

export type VehicleSortColumn = 'economic_number' | 'plate' | 'brand' | 'created_at'

export interface VehicleFilters {
  search: string
  vehicleType: string | null
  active: boolean | null
}

export interface VehicleSort {
  column: VehicleSortColumn
  direction: 'asc' | 'desc'
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

export async function fetchVehicles(
  organizationId: string,
  filters: VehicleFilters,
  sort: VehicleSort,
  page: number,
  pageSize: number,
): Promise<{ rows: Vehicle[]; count: number }> {
  let query = supabase
    .from('vehicles')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  const search = escapeIlikeTerm(filters.search)
  if (search) {
    query = query.or(`economic_number.ilike.%${search}%,plate.ilike.%${search}%,brand.ilike.%${search}%`)
  }
  if (filters.vehicleType) {
    query = query.eq('vehicle_type', filters.vehicleType)
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
