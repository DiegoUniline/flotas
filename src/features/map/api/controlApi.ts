import { supabase } from '@/lib/supabase'

export interface ControlKpis {
  vehiclesActive: number
  vehiclesTotal: number
  routesInProgress: number
  routesTotal: number
  jobsDelivered: number
  jobsScheduled: number
  stopsPending: number
}

export async function fetchControlKpis(organizationId: string, date: string): Promise<ControlKpis> {
  const [vehiclesActiveRes, vehiclesTotalRes, routesRes, jobsRes] = await Promise.all([
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
    supabase.from('route_plans').select('id, status').eq('organization_id', organizationId).eq('scheduled_date', date),
    supabase
      .from('jobs')
      .select('id, status')
      .eq('organization_id', organizationId)
      .eq('scheduled_date', date)
      .is('deleted_at', null),
  ])

  if (vehiclesActiveRes.error) throw vehiclesActiveRes.error
  if (vehiclesTotalRes.error) throw vehiclesTotalRes.error
  if (routesRes.error) throw routesRes.error
  if (jobsRes.error) throw jobsRes.error

  const routeIds = (routesRes.data ?? []).map((route) => route.id)
  let stopsPending = 0
  if (routeIds.length > 0) {
    const stopsRes = await supabase
      .from('route_stops')
      .select('id', { count: 'exact', head: true })
      .in('route_plan_id', routeIds)
      .eq('status', 'pending')
    if (stopsRes.error) throw stopsRes.error
    stopsPending = stopsRes.count ?? 0
  }

  return {
    vehiclesActive: vehiclesActiveRes.count ?? 0,
    vehiclesTotal: vehiclesTotalRes.count ?? 0,
    routesInProgress: (routesRes.data ?? []).filter((route) => route.status === 'in_progress').length,
    routesTotal: (routesRes.data ?? []).length,
    jobsDelivered: (jobsRes.data ?? []).filter((job) => job.status === 'delivered').length,
    jobsScheduled: (jobsRes.data ?? []).length,
    stopsPending,
  }
}
