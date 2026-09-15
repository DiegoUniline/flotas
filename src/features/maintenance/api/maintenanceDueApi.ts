import { supabase } from '@/lib/supabase'

interface VehicleRow {
  id: string
  economic_number: string
  plate: string | null
  current_odometer: number | null
}

interface TypeRow {
  id: string
  name: string
  interval_km: number | null
  interval_days: number | null
}

interface CompletedRecordRow {
  vehicle_id: string
  maintenance_type_id: string
  completed_date: string | null
  completed_odometer: number | null
}

export type DueStatus = 'overdue' | 'due_soon' | 'ok' | 'no_history'

export const DUE_STATUS_LABEL: Record<DueStatus, string> = {
  overdue: 'Vencido',
  due_soon: 'Próximo a vencer',
  ok: 'Al día',
  no_history: 'Sin historial',
}

export const DUE_STATUS_TONE: Record<DueStatus, string> = {
  overdue: 'bg-status-delayed-bg text-status-delayed',
  due_soon: 'bg-status-progress-bg text-status-progress',
  ok: 'bg-status-active-bg text-status-active',
  no_history: 'bg-gray-100 text-gray-500',
}

export interface DueRow {
  vehicleId: string
  vehicleLabel: string
  maintenanceTypeId: string
  maintenanceTypeName: string
  intervalKm: number | null
  intervalDays: number | null
  lastDoneDate: string | null
  lastDoneOdometer: number | null
  currentOdometer: number | null
  nextDueOdometer: number | null
  nextDueDate: string | null
  kmRemaining: number | null
  daysRemaining: number | null
  status: DueStatus
}

/** Ventana para marcar "próximo a vencer" en vez de "al día": 500 km o 15 días
 * antes del vencimiento real — da margen para programar el servicio, no es un
 * dato inventado, es el mismo criterio de cualquier recordatorio preventivo. */
const DUE_SOON_KM = 500
const DUE_SOON_DAYS = 15

function vehicleLabel(vehicle: { economic_number: string; plate: string | null }): string {
  return vehicle.plate ? `${vehicle.economic_number} · ${vehicle.plate}` : vehicle.economic_number
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Calcula, por cada combinación vehículo × tipo de servicio con intervalo
 * definido, cuándo toca el próximo servicio (por km y/o por fecha) a partir
 * del último `maintenance_records` completado de ese tipo para ese vehículo
 * — no depende de una tabla de "programación" aparte, se deriva de los
 * registros reales, igual que el resto del proyecto evita duplicar estado. */
export async function fetchMaintenanceDue(organizationId: string): Promise<DueRow[]> {
  const [vehiclesRes, typesRes, recordsRes] = await Promise.all([
    supabase
      .from('vehicles')
      .select('id, economic_number, plate, current_odometer')
      .eq('organization_id', organizationId)
      .eq('active', true)
      .is('deleted_at', null),
    supabase
      .from('maintenance_types')
      .select('id, name, interval_km, interval_days')
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      .eq('active', true)
      .is('deleted_at', null)
      .or('interval_km.not.is.null,interval_days.not.is.null'),
    supabase
      .from('maintenance_records')
      .select('vehicle_id, maintenance_type_id, completed_date, completed_odometer')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .order('completed_date', { ascending: false }),
  ])

  if (vehiclesRes.error) throw vehiclesRes.error
  if (typesRes.error) throw typesRes.error
  if (recordsRes.error) throw recordsRes.error

  const vehicles = (vehiclesRes.data ?? []) as VehicleRow[]
  const types = (typesRes.data ?? []) as TypeRow[]
  const records = (recordsRes.data ?? []) as CompletedRecordRow[]

  const lastDoneByKey = new Map<string, CompletedRecordRow>()
  for (const record of records) {
    const key = `${record.vehicle_id}:${record.maintenance_type_id}`
    if (!lastDoneByKey.has(key)) lastDoneByKey.set(key, record)
  }

  const today = new Date().toISOString().slice(0, 10)
  const rows: DueRow[] = []

  for (const vehicle of vehicles) {
    for (const type of types) {
      const key = `${vehicle.id}:${type.id}`
      const last = lastDoneByKey.get(key)
      const lastDoneDate = last?.completed_date ?? null
      const lastDoneOdometer = last?.completed_odometer ?? null

      const nextDueOdometer = type.interval_km != null && lastDoneOdometer != null ? lastDoneOdometer + type.interval_km : null
      const nextDueDate = type.interval_days != null && lastDoneDate != null ? addDays(lastDoneDate, type.interval_days) : null

      const kmRemaining = nextDueOdometer != null && vehicle.current_odometer != null ? nextDueOdometer - vehicle.current_odometer : null
      const daysRemaining =
        nextDueDate != null
          ? Math.round((new Date(`${nextDueDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000)
          : null

      let status: DueStatus
      if (!last) {
        status = 'no_history'
      } else if ((kmRemaining != null && kmRemaining <= 0) || (daysRemaining != null && daysRemaining <= 0)) {
        status = 'overdue'
      } else if ((kmRemaining != null && kmRemaining <= DUE_SOON_KM) || (daysRemaining != null && daysRemaining <= DUE_SOON_DAYS)) {
        status = 'due_soon'
      } else {
        status = 'ok'
      }

      rows.push({
        vehicleId: vehicle.id,
        vehicleLabel: vehicleLabel(vehicle),
        maintenanceTypeId: type.id,
        maintenanceTypeName: type.name,
        intervalKm: type.interval_km,
        intervalDays: type.interval_days,
        lastDoneDate,
        lastDoneOdometer,
        currentOdometer: vehicle.current_odometer,
        nextDueOdometer,
        nextDueDate,
        kmRemaining,
        daysRemaining,
        status,
      })
    }
  }

  const statusOrder: Record<DueStatus, number> = { overdue: 0, due_soon: 1, no_history: 2, ok: 3 }
  return rows.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
}
