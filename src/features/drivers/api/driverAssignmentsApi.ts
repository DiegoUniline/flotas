import { supabase } from '@/lib/supabase'

export interface AssignedVehicle {
  id: string
  economic_number: string | null
  plate: string | null
}

export async function fetchAssignedVehicle(driverId: string): Promise<AssignedVehicle | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, economic_number, plate')
    .eq('assigned_driver_id', driverId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return data
}

export interface AssignmentHistoryRow {
  id: string
  starts_at: string
  ends_at: string | null
  active: boolean
  notes: string | null
  vehicles: { economic_number: string | null; plate: string | null } | null
}

export async function fetchAssignmentHistory(driverId: string): Promise<AssignmentHistoryRow[]> {
  const { data, error } = await supabase
    .from('vehicle_driver_assignments')
    .select('id, starts_at, ends_at, active, notes, vehicles(economic_number, plate)')
    .eq('driver_id', driverId)
    .order('starts_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as AssignmentHistoryRow[]
}

export async function assignVehicleToDriver(vehicleId: string, driverId: string, notes?: string): Promise<void> {
  const { error } = await supabase.rpc('assign_vehicle_to_driver', {
    p_vehicle_id: vehicleId,
    p_driver_id: driverId,
    p_notes: notes ?? undefined,
  })
  if (error) throw error
}

export async function unassignVehicle(vehicleId: string): Promise<void> {
  const { error } = await supabase.rpc('unassign_vehicle', { p_vehicle_id: vehicleId })
  if (error) throw error
}
