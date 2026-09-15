import { supabase } from '@/lib/supabase'
import { fetchMaintenanceDue } from '@/features/maintenance/api/maintenanceDueApi'
import { fetchLowStockParts } from '@/features/alerts/api/alertsApi'
import { fetchAllDocuments } from '@/features/documents/api/documentsApi'

export interface HomeSummary {
  vehiclesActive: number
  vehiclesTotal: number
  jobsToday: number
  maintenanceOverdueCount: number
  lowStockPartsCount: number
  documentsExpiringCount: number
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Resumen real para "Inicio" — reutiliza exactamente las mismas fuentes
 * ya construidas para Alertas/Indicadores/Documentos (`maintenanceDueApi`,
 * `alertsApi.fetchLowStockParts`, `documentsApi.fetchAllDocuments`), no se
 * duplica ningún cálculo. Visible para cualquier miembro de la
 * organización (sin `permission` en `navConfig.ts`) — cada conteo ya está
 * protegido por la RLS de su propia tabla vía membresía de organización. */
export async function fetchHomeSummary(organizationId: string): Promise<HomeSummary> {
  const date = todayIso()

  const [vehiclesActiveRes, vehiclesTotalRes, jobsTodayRes, maintenanceDue, lowStockParts, documents] = await Promise.all([
    supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('active', true).is('deleted_at', null),
    supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).is('deleted_at', null),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('scheduled_date', date).is('deleted_at', null),
    fetchMaintenanceDue(organizationId),
    fetchLowStockParts(organizationId),
    fetchAllDocuments(organizationId),
  ])

  if (vehiclesActiveRes.error) throw vehiclesActiveRes.error
  if (vehiclesTotalRes.error) throw vehiclesTotalRes.error
  if (jobsTodayRes.error) throw jobsTodayRes.error

  return {
    vehiclesActive: vehiclesActiveRes.count ?? 0,
    vehiclesTotal: vehiclesTotalRes.count ?? 0,
    jobsToday: jobsTodayRes.count ?? 0,
    maintenanceOverdueCount: maintenanceDue.filter((r) => r.status === 'overdue').length,
    lowStockPartsCount: lowStockParts.length,
    documentsExpiringCount: documents.filter((d) => d.status === 'expired' || d.status === 'expiring_soon').length,
  }
}
