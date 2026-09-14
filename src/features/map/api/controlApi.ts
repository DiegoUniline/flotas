import { supabase } from '@/lib/supabase'

export interface ControlKpis {
  vehiclesActive: number
  vehiclesTotal: number
  routesInProgress: number
  routesTotal: number
  jobsDelivered: number
  jobsScheduled: number
  stopsPending: number
  /** % de cambio vs. el día anterior (mismo cálculo, fecha - 1). Null cuando
   * ayer fue 0 (división indefinida) — no se muestra tendencia en ese caso. */
  routesInProgressTrendPct: number | null
  jobsDeliveredTrendPct: number | null
}

async function fetchDayCounts(organizationId: string, date: string) {
  const routesRes = await supabase.from('route_plans').select('id, status').eq('organization_id', organizationId).eq('scheduled_date', date)
  if (routesRes.error) throw routesRes.error
  const jobsRes = await supabase
    .from('jobs')
    .select('id, status')
    .eq('organization_id', organizationId)
    .eq('scheduled_date', date)
    .is('deleted_at', null)
  if (jobsRes.error) throw jobsRes.error

  return {
    routesInProgress: (routesRes.data ?? []).filter((route) => route.status === 'in_progress').length,
    routesTotal: (routesRes.data ?? []).length,
    jobsDelivered: (jobsRes.data ?? []).filter((job) => job.status === 'delivered').length,
    jobsScheduled: (jobsRes.data ?? []).length,
    routeIds: (routesRes.data ?? []).map((route) => route.id),
  }
}

function trendPct(today: number, yesterday: number): number | null {
  if (yesterday === 0) return null
  return Math.round(((today - yesterday) / yesterday) * 100)
}

function previousDay(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export interface DayJob {
  id: string
  job_number: string | null
  status: string
  priority: string
  amount: number | null
  receiver_name: string | null
  assigned_driver_id: string | null
  customers: { name: string } | null
  customer_locations: { name: string; address: string | null; latitude: number | null; longitude: number | null } | null
  drivers: { first_name: string; last_name: string; phone: string | null; photo_url: string | null } | null
  vehicles: { economic_number: string | null; plate: string | null; brand: string | null; model: string | null } | null
}

/** Pedidos programados del día seleccionado, con la ubicación real de
 * entrega (`customer_locations`) para poder graficarlos en el mapa aunque
 * todavía no tengan una ruta/parada asignada, y el operador/vehículo que
 * ya se le haya asignado (si aplica) para el panel de detalle al hacer
 * click en su punto. */
export async function fetchDayJobs(organizationId: string, date: string): Promise<DayJob[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select(
      'id, job_number, status, priority, amount, receiver_name, assigned_driver_id, customers(name), customer_locations!jobs_customer_location_id_fkey(name, address, latitude, longitude), drivers(first_name, last_name, phone, photo_url), vehicles(economic_number, plate, brand, model)',
    )
    .eq('organization_id', organizationId)
    .eq('scheduled_date', date)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as DayJob[]
}

export interface LiveVehiclePosition {
  id: string
  economic_number: string | null
  plate: string | null
  last_latitude: number
  last_longitude: number
  last_position_at: string
  assigned_driver_id: string | null
  drivers: { first_name: string; last_name: string } | null
}

/** Vehículos con posición real conocida (compartida desde el celular del
 * operador vía `update_my_vehicle_position`, o cualquier otra fuente que
 * en el futuro escriba `last_latitude/longitude`) — no es una simulación,
 * solo se pintan los que de verdad tienen una lectura guardada. */
export async function fetchLiveVehiclePositions(organizationId: string): Promise<LiveVehiclePosition[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, economic_number, plate, last_latitude, last_longitude, last_position_at, assigned_driver_id, drivers(first_name, last_name)')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .not('last_latitude', 'is', null)
    .not('last_longitude', 'is', null)
    .not('last_position_at', 'is', null)
  if (error) throw error
  return (data ?? []) as unknown as LiveVehiclePosition[]
}

export async function fetchControlKpis(organizationId: string, date: string): Promise<ControlKpis> {
  const [vehiclesActiveRes, vehiclesTotalRes, today, yesterday] = await Promise.all([
    supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('active', true)
      .is('deleted_at', null),
    supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .is('deleted_at', null),
    fetchDayCounts(organizationId, date),
    fetchDayCounts(organizationId, previousDay(date)),
  ])

  if (vehiclesActiveRes.error) throw vehiclesActiveRes.error
  if (vehiclesTotalRes.error) throw vehiclesTotalRes.error

  let stopsPending = 0
  if (today.routeIds.length > 0) {
    const stopsRes = await supabase
      .from('route_stops')
      .select('id', { count: 'exact', head: true })
      .in('route_plan_id', today.routeIds)
      .eq('status', 'pending')
    if (stopsRes.error) throw stopsRes.error
    stopsPending = stopsRes.count ?? 0
  }

  return {
    vehiclesActive: vehiclesActiveRes.count ?? 0,
    vehiclesTotal: vehiclesTotalRes.count ?? 0,
    routesInProgress: today.routesInProgress,
    routesTotal: today.routesTotal,
    jobsDelivered: today.jobsDelivered,
    jobsScheduled: today.jobsScheduled,
    stopsPending,
    routesInProgressTrendPct: trendPct(today.routesInProgress, yesterday.routesInProgress),
    jobsDeliveredTrendPct: trendPct(today.jobsDelivered, yesterday.jobsDelivered),
  }
}
