import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database'
import { fetchJobForStop } from '@/features/jobs/api/jobsApi'

export type RouteStop = Tables<'route_stops'>
export type RouteStopUpdate = TablesUpdate<'route_stops'>

export interface RouteStopWithJob extends RouteStop {
  jobs: { job_number: string | null; status: string; customers: { name: string } | null } | null
}

export const STOP_STATUSES = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En camino' },
  { value: 'completed', label: 'Completada' },
  { value: 'skipped', label: 'Omitida' },
] as const

const JOB_TYPE_TO_STOP_TYPE: Record<string, string> = {
  delivery: 'delivery',
  pickup: 'pickup',
  service: 'service',
}

export async function fetchRouteStops(routePlanId: string): Promise<RouteStopWithJob[]> {
  const { data, error } = await supabase
    .from('route_stops')
    .select('*, jobs(job_number, status, customers(name))')
    .eq('route_plan_id', routePlanId)
    .order('sequence', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as RouteStopWithJob[]
}

export async function addStopFromJob(organizationId: string, routePlanId: string, jobId: string): Promise<RouteStop> {
  const job = await fetchJobForStop(jobId)

  const { data: existingStops, error: countError } = await supabase
    .from('route_stops')
    .select('sequence')
    .eq('route_plan_id', routePlanId)
    .order('sequence', { ascending: false })
    .limit(1)
  if (countError) throw countError

  const nextSequence = (existingStops?.[0]?.sequence ?? 0) + 1

  const { data, error } = await supabase
    .from('route_stops')
    .insert({
      organization_id: organizationId,
      route_plan_id: routePlanId,
      job_id: jobId,
      stop_type: JOB_TYPE_TO_STOP_TYPE[job.job_type] ?? 'waypoint',
      sequence: nextSequence,
      name: job.customer_locations?.name ?? job.job_number ?? null,
      address: job.customer_locations?.address ?? null,
      latitude: job.customer_locations?.latitude ?? null,
      longitude: job.customer_locations?.longitude ?? null,
      service_minutes: job.estimated_service_minutes,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRouteStop(id: string, input: RouteStopUpdate): Promise<RouteStop> {
  const { data, error } = await supabase.from('route_stops').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteRouteStop(id: string): Promise<void> {
  const { error } = await supabase.from('route_stops').delete().eq('id', id)
  if (error) throw error
}

/** Busca si un pedido ya está como parada de alguna ruta (la más reciente),
 * para que al hacer click en su punto en el mapa se pueda abrir el panel
 * completo de la ruta en vez del panel simple del pedido suelto. */
export async function fetchRoutePlanIdForJob(jobId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('route_stops')
    .select('route_plan_id')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.route_plan_id ?? null
}

export async function markStopStatus(id: string, status: string): Promise<RouteStop> {
  const timestamps: RouteStopUpdate = { status }
  if (status === 'in_progress') timestamps.arrived_at = new Date().toISOString()
  if (status === 'completed') timestamps.completed_at = new Date().toISOString()
  return updateRouteStop(id, timestamps)
}
