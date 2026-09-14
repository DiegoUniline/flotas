import { supabase } from '@/lib/supabase'

export interface MyDriverProfile {
  driverId: string
  driverName: string
  vehicle: {
    id: string
    label: string
    lastLatitude: number | null
    lastLongitude: number | null
    lastPositionAt: string | null
  } | null
}

/** Resuelve si el usuario logueado es un operador (drivers.user_id) y, si
 * tiene un vehículo asignado hoy, su última posición real conocida. Null
 * cuando el usuario no tiene perfil de operador — así la UI puede ocultar
 * "Compartir mi ubicación" para el resto del personal. */
export async function fetchMyDriverProfile(userId: string): Promise<MyDriverProfile | null> {
  const { data: driver, error: driverError } = await supabase
    .from('drivers')
    .select('id, first_name, last_name')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle()
  if (driverError) throw driverError
  if (!driver) return null

  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('id, economic_number, plate, last_latitude, last_longitude, last_position_at')
    .eq('assigned_driver_id', driver.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (vehicleError) throw vehicleError

  return {
    driverId: driver.id,
    driverName: `${driver.first_name} ${driver.last_name}`,
    vehicle: vehicle
      ? {
          id: vehicle.id,
          label: vehicle.economic_number ?? vehicle.plate ?? 'Vehículo',
          lastLatitude: vehicle.last_latitude,
          lastLongitude: vehicle.last_longitude,
          lastPositionAt: vehicle.last_position_at,
        }
      : null,
  }
}

/** Guarda la posición real del celular del operador en el vehículo que
 * tiene asignado — vía RPC (`update_my_vehicle_position`), nunca con un
 * update directo a `vehicles` (el operador no tiene permiso vehicles.edit,
 * la RPC valida internamente que sea su propio vehículo asignado). */
export async function updateMyVehiclePosition(latitude: number, longitude: number): Promise<void> {
  const { error } = await supabase.rpc('update_my_vehicle_position', { p_latitude: latitude, p_longitude: longitude })
  if (error) throw error
}
