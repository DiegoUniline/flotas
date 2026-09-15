import { supabase } from '@/lib/supabase'
import type { DateRangeValue } from '@/lib/dateRanges'
import { JOB_STATUSES } from '@/features/jobs/api/jobsApi'

/** Reportes tabulares sobre columnas que ya existen en `jobs`/`route_stops`/
 * `route_plans` — sin ninguna tabla nueva. Trae las filas del periodo y
 * agrega en el cliente, mismo criterio ya aceptado en `costsApi.ts`
 * ("Agrupar por" del patrón Odoo): correcto para el volumen típico de una
 * PyME dentro de un rango de fechas acotado, con `ROW_LIMIT` de seguridad. */
const ROW_LIMIT = 3000

export interface JobStatusCountRow {
  status: string
  count: number
}

export interface OnTimeStats {
  evaluated: number
  onTime: number
  late: number
  onTimePct: number | null
}

export interface TopCustomerRow {
  customerId: string
  name: string
  jobCount: number
  totalAmount: number
}

export interface DriverActivityRow {
  driverId: string
  name: string
  deliveredCount: number
  totalJobs: number
}

export async function fetchJobStatusCounts(organizationId: string, dateRange: DateRangeValue): Promise<JobStatusCountRow[]> {
  let query = supabase.from('jobs').select('status').eq('organization_id', organizationId).is('deleted_at', null).limit(ROW_LIMIT)
  if (dateRange.from) query = query.gte('scheduled_date', dateRange.from)
  if (dateRange.to) query = query.lte('scheduled_date', dateRange.to)

  const { data, error } = await query
  if (error) throw error

  const counts = new Map<string, number>()
  for (const row of data ?? []) counts.set(row.status, (counts.get(row.status) ?? 0) + 1)

  return JOB_STATUSES.map((s) => ({ status: s.value, count: counts.get(s.value) ?? 0 })).filter((r) => r.count > 0 || counts.size === 0)
}

/** Entregas a tiempo vs. tarde — compara `route_stops.completed_at` contra
 * `estimated_arrival_at`, el único par de columnas reales que ya existe
 * para medir esto (ambas se capturan desde Fase 4/Centro de control). Solo
 * evalúa paradas que tienen los dos datos — una parada sin estimado no se
 * puede calificar de a tiempo/tarde, no se inventa un supuesto. */
export async function fetchOnTimeStats(organizationId: string, dateRange: DateRangeValue): Promise<OnTimeStats> {
  let plansQuery = supabase.from('route_plans').select('id').eq('organization_id', organizationId).limit(ROW_LIMIT)
  if (dateRange.from) plansQuery = plansQuery.gte('scheduled_date', dateRange.from)
  if (dateRange.to) plansQuery = plansQuery.lte('scheduled_date', dateRange.to)

  const plansRes = await plansQuery
  if (plansRes.error) throw plansRes.error
  const planIds = (plansRes.data ?? []).map((p) => p.id)

  if (planIds.length === 0) return { evaluated: 0, onTime: 0, late: 0, onTimePct: null }

  const { data, error } = await supabase
    .from('route_stops')
    .select('completed_at, estimated_arrival_at')
    .in('route_plan_id', planIds)
    .not('completed_at', 'is', null)
    .not('estimated_arrival_at', 'is', null)
    .limit(ROW_LIMIT)
  if (error) throw error

  let onTime = 0
  let late = 0
  for (const row of data ?? []) {
    if (new Date(row.completed_at!).getTime() <= new Date(row.estimated_arrival_at!).getTime()) onTime += 1
    else late += 1
  }
  const evaluated = onTime + late
  return { evaluated, onTime, late, onTimePct: evaluated > 0 ? Math.round((onTime / evaluated) * 100) : null }
}

interface JobForAggRow {
  amount: number | null
  customer_id: string | null
  assigned_driver_id: string | null
  status: string
  customers: { name: string } | null
  drivers: { first_name: string; last_name: string } | null
}

export async function fetchTopCustomers(organizationId: string, dateRange: DateRangeValue, limit = 10): Promise<TopCustomerRow[]> {
  let query = supabase
    .from('jobs')
    .select('amount, customer_id, customers(name)')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .not('customer_id', 'is', null)
    .limit(ROW_LIMIT)
  if (dateRange.from) query = query.gte('scheduled_date', dateRange.from)
  if (dateRange.to) query = query.lte('scheduled_date', dateRange.to)

  const { data, error } = await query
  if (error) throw error

  const byCustomer = new Map<string, TopCustomerRow>()
  for (const row of (data ?? []) as unknown as JobForAggRow[]) {
    if (!row.customer_id) continue
    const existing = byCustomer.get(row.customer_id) ?? {
      customerId: row.customer_id,
      name: row.customers?.name ?? 'Sin nombre',
      jobCount: 0,
      totalAmount: 0,
    }
    existing.jobCount += 1
    existing.totalAmount += Number(row.amount ?? 0)
    byCustomer.set(row.customer_id, existing)
  }

  return Array.from(byCustomer.values())
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit)
}

export async function fetchDriverActivity(organizationId: string, dateRange: DateRangeValue, limit = 10): Promise<DriverActivityRow[]> {
  let query = supabase
    .from('jobs')
    .select('status, assigned_driver_id, drivers(first_name, last_name)')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .not('assigned_driver_id', 'is', null)
    .limit(ROW_LIMIT)
  if (dateRange.from) query = query.gte('scheduled_date', dateRange.from)
  if (dateRange.to) query = query.lte('scheduled_date', dateRange.to)

  const { data, error } = await query
  if (error) throw error

  const byDriver = new Map<string, DriverActivityRow>()
  for (const row of (data ?? []) as unknown as JobForAggRow[]) {
    if (!row.assigned_driver_id) continue
    const existing = byDriver.get(row.assigned_driver_id) ?? {
      driverId: row.assigned_driver_id,
      name: row.drivers ? `${row.drivers.first_name} ${row.drivers.last_name}` : 'Sin nombre',
      deliveredCount: 0,
      totalJobs: 0,
    }
    existing.totalJobs += 1
    if (row.status === 'delivered') existing.deliveredCount += 1
    byDriver.set(row.assigned_driver_id, existing)
  }

  return Array.from(byDriver.values())
    .sort((a, b) => b.deliveredCount - a.deliveredCount)
    .slice(0, limit)
}
