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
