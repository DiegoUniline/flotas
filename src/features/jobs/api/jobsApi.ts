import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type Job = Tables<'jobs'>
export type JobInsert = Omit<TablesInsert<'jobs'>, 'organization_id' | 'created_by'>
export type JobUpdate = TablesUpdate<'jobs'>

export interface JobWithRelations extends Job {
  customers: { name: string } | null
  customer_locations: { name: string; address: string | null } | null
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

export type JobSortColumn = 'scheduled_date' | 'job_number' | 'created_at'

export interface JobFilters {
  search: string
  status: string | null
  scheduledDate: string | null
}

export interface JobSort {
  column: JobSortColumn
  direction: 'asc' | 'desc'
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

const JOB_SELECT_WITH_RELATIONS =
  '*, customers(name), customer_locations(name, address), drivers(first_name, last_name), vehicles(economic_number, plate)'

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
    query = query.ilike('job_number', `%${search}%`)
  }
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.scheduledDate) {
    query = query.eq('scheduled_date', filters.scheduledDate)
  }

  const from = page * pageSize
  const to = from + pageSize - 1
  query = query.order(sort.column, { ascending: sort.direction === 'asc' }).range(from, to)

  const { data, error, count } = await query
  if (error) throw error
  return { rows: (data ?? []) as unknown as JobWithRelations[], count: count ?? 0 }
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

export async function fetchPendingJobOptions(organizationId: string): Promise<JobOption[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('id, job_number, customers(name)')
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .is('deleted_at', null)
    .order('scheduled_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as JobOption[]
}
