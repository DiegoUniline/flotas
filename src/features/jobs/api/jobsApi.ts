import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import { applyFilters, type AppliedFilter } from '@/lib/queryFilters'
import type { DateRangeValue } from '@/lib/dateRanges'

export type Job = Tables<'jobs'>
export type JobInsert = Omit<TablesInsert<'jobs'>, 'organization_id' | 'created_by'>
export type JobUpdate = TablesUpdate<'jobs'>

export interface JobWithRelations extends Job {
  customers: { name: string } | null
  customer_locations: { name: string; address: string | null } | null
  origin_customer_locations: { name: string; address: string | null } | null
  origin_branch_locations: { name: string } | null
  drivers: { first_name: string; last_name: string } | null
  vehicles: { economic_number: string | null; plate: string | null } | null
}

export const JOB_TYPES = [
  { value: 'delivery', label: 'Entrega' },
  { value: 'pickup', label: 'Recolección' },
  { value: 'service', label: 'Servicio' },
  { value: 'other', label: 'Otro' },
] as const

export const JOB_STATUSES = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'en_route', label: 'En camino' },
  { value: 'arrived', label: 'Llegó' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'partial', label: 'Entrega parcial' },
  { value: 'not_delivered', label: 'No entregado' },
  { value: 'rejected', label: 'Rechazado' },
  { value: 'rescheduled', label: 'Reprogramado' },
] as const

export const JOB_PRIORITIES = [
  { value: 'low', label: 'Baja' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
] as const

export const ORIGIN_TYPES = [
  { value: 'pickup', label: 'Pasamos a recoger' },
  { value: 'branch', label: 'Lo entregan en sucursal' },
] as const

export type JobSortColumn = 'scheduled_date' | 'job_number' | 'created_at'

export interface JobFilters {
  search: string
  dateRange: DateRangeValue
  advanced: AppliedFilter[]
  groupBy: string | null
}

export interface JobSort {
  column: JobSortColumn
  direction: 'asc' | 'desc'
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

const JOB_SELECT_WITH_RELATIONS =
  '*, customers(name), customer_locations!jobs_customer_location_id_fkey(name, address), origin_customer_locations:customer_locations!jobs_origin_customer_location_id_fkey(name, address), origin_branch_locations:locations!jobs_origin_branch_location_id_fkey(name), drivers(first_name, last_name), vehicles(economic_number, plate)'

/** Cuando hay agrupación se trae un lote más grande para que los grupos no
 * queden cortados a la mitad entre páginas (mismo criterio que Vehículos). */
const GROUPED_PAGE_SIZE = 300

export async function fetchJobs(
  organizationId: string,
  filters: JobFilters,
  sort: JobSort,
  page: number,
  pageSize: number,
): Promise<{ rows: JobWithRelations[]; count: number }> {
  let query = supabase
    .from('jobs')
    .select(JOB_SELECT_WITH_RELATIONS, { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  const search = escapeIlikeTerm(filters.search)
  if (search) {
    query = query.or(`job_number.ilike.%${search}%,sender_name.ilike.%${search}%,receiver_name.ilike.%${search}%`)
  }
  if (filters.dateRange.from) query = query.gte('scheduled_date', filters.dateRange.from)
  if (filters.dateRange.to) query = query.lte('scheduled_date', filters.dateRange.to)

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
  return { rows: (data ?? []) as unknown as JobWithRelations[], count: count ?? 0 }
}

export async function fetchJobById(id: string): Promise<JobWithRelations> {
  const { data, error } = await supabase.from('jobs').select(JOB_SELECT_WITH_RELATIONS).eq('id', id).single()
  if (error) throw error
  return data as unknown as JobWithRelations
}

export async function createJob(organizationId: string, input: JobInsert): Promise<Job> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('jobs')
    .insert({ ...input, organization_id: organizationId, created_by: user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateJob(id: string, input: JobUpdate): Promise<Job> {
  const { data, error } = await supabase.from('jobs').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function softDeleteJob(id: string): Promise<void> {
  const { error } = await supabase.from('jobs').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export interface JobOption {
  id: string
  job_number: string | null
  customers: { name: string } | null
}

export async function fetchPendingJobOptions(organizationId: string, scheduledDate?: string): Promise<JobOption[]> {
  let query = supabase
    .from('jobs')
    .select('id, job_number, customers(name)')
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .is('deleted_at', null)

  if (scheduledDate) {
    query = query.eq('scheduled_date', scheduledDate)
  }

  const { data, error } = await query.order('scheduled_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as JobOption[]
}

export interface MyJob {
  id: string
  job_number: string | null
  status: string
  priority: string
  scheduled_date: string | null
  time_window_start: string | null
  time_window_end: string | null
  amount: number | null
  cod_amount: number | null
  receiver_name: string | null
  receiver_phone: string | null
  instructions: string | null
  received_at: string | null
  delivery_latitude: number | null
  delivery_longitude: number | null
  customers: { name: string } | null
  customer_locations: { name: string; address: string | null; latitude: number | null; longitude: number | null } | null
}

const MY_JOB_SELECT =
  'id, job_number, status, priority, scheduled_date, time_window_start, time_window_end, amount, cod_amount, receiver_name, receiver_phone, instructions, received_at, delivery_latitude, delivery_longitude, customers(name), customer_locations!jobs_customer_location_id_fkey(name, address, latitude, longitude)'

/** Pedidos asignados a un operador — vista angosta para la app del
 * repartidor (`/mis-pedidos`), no la lista administrativa completa de
 * `fetchJobs`. Filtrar por `assigned_driver_id` es un filtro de UX (RLS ya
 * permite a cualquier miembro de la org ver todos los pedidos vía
 * `jobs_select`), igual criterio que el resto del proyecto. */
export async function fetchMyJobs(driverId: string): Promise<MyJob[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select(MY_JOB_SELECT)
    .eq('assigned_driver_id', driverId)
    .is('deleted_at', null)
    .order('scheduled_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data ?? []) as unknown as MyJob[]
}

export interface JobForStop {
  id: string
  job_number: string | null
  job_type: string
  estimated_service_minutes: number | null
  customer_locations: { name: string; address: string | null; latitude: number | null; longitude: number | null } | null
}

export async function fetchJobForStop(jobId: string): Promise<JobForStop> {
  const { data, error } = await supabase
    .from('jobs')
    .select('id, job_number, job_type, estimated_service_minutes, customer_locations!jobs_customer_location_id_fkey(name, address, latitude, longitude)')
    .eq('id', jobId)
    .single()
  if (error) throw error
  return data as unknown as JobForStop
}
