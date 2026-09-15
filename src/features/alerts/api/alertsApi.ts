import { supabase } from '@/lib/supabase'
import { fetchMaintenanceDue, type DueRow } from '@/features/maintenance/api/maintenanceDueApi'
import { fetchAllDocuments, type UnifiedDocumentRow } from '@/features/documents/api/documentsApi'
import { fetchOpenIncidents, type OpenIncidentRow } from '@/features/incidents/api/incidentsApi'

export interface LowStockPartRow {
  id: string
  name: string
  sku: string | null
  quantity_on_hand: number
  min_stock: number
}

export interface PendingExpenseRow {
  id: string
  expense_date: string
  category: string
  amount: number
  vehicles: { economic_number: string; plate: string | null } | null
}

export interface AlertsSummary {
  maintenanceDue: DueRow[]
  lowStockParts: LowStockPartRow[]
  expiringDocuments: UnifiedDocumentRow[]
  openIncidents: OpenIncidentRow[]
  pendingExpenses: PendingExpenseRow[]
}

/** Refacciones con existencia igual o por debajo del mínimo definido —
 * misma condición ya usada como badge "Stock bajo" en `PartsTable`, aquí
 * se agrega como su propia alerta agrupada. */
export async function fetchLowStockParts(organizationId: string): Promise<LowStockPartRow[]> {
  const { data, error } = await supabase
    .from('parts')
    .select('id, name, sku, quantity_on_hand, min_stock')
    .eq('organization_id', organizationId)
    .eq('active', true)
    .is('deleted_at', null)
    .not('min_stock', 'is', null)
  if (error) throw error
  return (data ?? []).filter((p) => p.min_stock != null && p.quantity_on_hand <= p.min_stock) as LowStockPartRow[]
}

export async function fetchPendingExpenses(organizationId: string, limit = 50): Promise<PendingExpenseRow[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('id, expense_date, category, amount, vehicles(economic_number, plate)')
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .is('deleted_at', null)
    .order('expense_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as unknown as PendingExpenseRow[]
}

/** Agregación de las 5 alertas operativas reales del proyecto — NO es un
 * motor de alertas/notificaciones (eso sigue fuera de alcance, Fase 6 del
 * roadmap): cada fuente aquí reutiliza la consulta/lógica que ya existe en
 * su módulo dueño (`maintenanceDueApi`, `documentsApi`, `incidentsApi`),
 * nunca se duplica el cálculo. */
export async function fetchAlertsSummary(organizationId: string): Promise<AlertsSummary> {
  const [maintenanceDue, allDocuments, lowStockParts, openIncidents, pendingExpenses] = await Promise.all([
    fetchMaintenanceDue(organizationId),
    fetchAllDocuments(organizationId),
    fetchLowStockParts(organizationId),
    fetchOpenIncidents(organizationId),
    fetchPendingExpenses(organizationId),
  ])

  return {
    maintenanceDue: maintenanceDue.filter((r) => r.status === 'overdue' || r.status === 'due_soon'),
    lowStockParts,
    expiringDocuments: allDocuments.filter((d) => d.status === 'expired' || d.status === 'expiring_soon'),
    openIncidents,
    pendingExpenses,
  }
}
