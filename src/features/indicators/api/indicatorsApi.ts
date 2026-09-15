import { supabase } from '@/lib/supabase'
import { fetchMaintenanceDue } from '@/features/maintenance/api/maintenanceDueApi'
import { fetchAllDocuments } from '@/features/documents/api/documentsApi'

export interface OperationalIndicators {
  onTimePct: number | null
  onTimeTrendPct: number | null
  jobsDelivered: number
  jobsDeliveredTrendPct: number | null
  vehiclesActive: number
  vehiclesTotal: number
  maintenanceOverdueCount: number
  documentsExpiringCount: number
}

/** Mismo cálculo de tendencia (% de cambio vs. el día anterior) ya usado
 * en `fetchControlKpis` del Centro de control — reutilizado aquí, no
 * reinventado. Null cuando ayer fue 0 (división indefinida). */
function trendPct(today: number, yesterday: number): number | null {
  if (yesterday === 0) return null
  return Math.round(((today - yesterday) / yesterday) * 100)
}

function previousDay(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

async function fetchDayDeliveredCount(organizationId: string, date: string): Promise<number> {
  const { count, error } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('scheduled_date', date)
    .eq('status', 'delivered')
    .is('deleted_at', null)
  if (error) throw error
  return count ?? 0
}

/** % de entregas a tiempo de un día específico — mismo criterio de
 * `reportsApi.fetchOnTimeStats` (compara `route_stops.completed_at` contra
 * `estimated_arrival_at`) pero acotado a un solo día, para poder comparar
 * hoy vs. ayer. */
async function fetchOnTimePctForDate(organizationId: string, date: string): Promise<number | null> {
  const plansRes = await supabase.from('route_plans').select('id').eq('organization_id', organizationId).eq('scheduled_date', date)
  if (plansRes.error) throw plansRes.error
  const planIds = (plansRes.data ?? []).map((p) => p.id)
  if (planIds.length === 0) return null

  const { data, error } = await supabase
    .from('route_stops')
    .select('completed_at, estimated_arrival_at')
    .in('route_plan_id', planIds)
    .not('completed_at', 'is', null)
    .not('estimated_arrival_at', 'is', null)
  if (error) throw error

  let onTime = 0
  let total = 0
  for (const row of data ?? []) {
    total += 1
    if (new Date(row.completed_at!).getTime() <= new Date(row.estimated_arrival_at!).getTime()) onTime += 1
  }
  return total > 0 ? Math.round((onTime / total) * 100) : null
}

/** KPIs operativos del día — distintos de `costsApi` (financiero) y
 * `reportsApi` (tabular por periodo): son indicadores de un vistazo con
 * tendencia vs. el día comparable anterior, mismo patrón ya validado en
 * el Centro de control. Flota activa/mantenimientos vencidos/documentos
 * por vencer son backlogs del momento (mismo criterio ya documentado para
 * "Paradas pendientes" en el Centro de control) — sin badge de tendencia,
 * un % ahí sería ruido, no una tendencia real. */
export async function fetchOperationalIndicators(organizationId: string, date: string): Promise<OperationalIndicators> {
  const yesterday = previousDay(date)

  const [onTimeToday, onTimeYesterday, deliveredToday, deliveredYesterday, vehiclesActiveRes, vehiclesTotalRes, maintenanceDue, documents] =
    await Promise.all([
      fetchOnTimePctForDate(organizationId, date),
      fetchOnTimePctForDate(organizationId, yesterday),
      fetchDayDeliveredCount(organizationId, date),
      fetchDayDeliveredCount(organizationId, yesterday),
      supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('active', true).is('deleted_at', null),
      supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).is('deleted_at', null),
      fetchMaintenanceDue(organizationId),
      fetchAllDocuments(organizationId),
    ])

  if (vehiclesActiveRes.error) throw vehiclesActiveRes.error
  if (vehiclesTotalRes.error) throw vehiclesTotalRes.error

  return {
    onTimePct: onTimeToday,
    onTimeTrendPct: onTimeToday != null && onTimeYesterday != null ? trendPct(onTimeToday, onTimeYesterday) : null,
    jobsDelivered: deliveredToday,
    jobsDeliveredTrendPct: trendPct(deliveredToday, deliveredYesterday),
    vehiclesActive: vehiclesActiveRes.count ?? 0,
    vehiclesTotal: vehiclesTotalRes.count ?? 0,
    maintenanceOverdueCount: maintenanceDue.filter((r) => r.status === 'overdue').length,
    documentsExpiringCount: documents.filter((d) => d.status === 'expired' || d.status === 'expiring_soon').length,
  }
}
