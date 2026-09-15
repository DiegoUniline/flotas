import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Wrench, Package, FileWarning, AlertTriangle, Receipt } from 'lucide-react'
import { PageScroll } from '@/components/ui/PageScroll'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { useOrg } from '@/context/OrgContext'
import { formatCurrency, formatDate } from '@/lib/format'
import { fetchAlertsSummary } from './api/alertsApi'
import type { DueStatus } from '@/features/maintenance/api/maintenanceDueApi'
import { DOCUMENT_SOURCE_LABEL, DOCUMENT_STATUS_LABEL, type DocumentStatus } from '@/features/documents/api/documentsApi'
import { INCIDENT_SEVERITIES, INCIDENT_TYPES } from '@/features/incidents/api/incidentsApi'
import { EXPENSE_CATEGORIES } from '@/features/expenses/api/expensesApi'

const DUE_STATUS_LABEL: Record<DueStatus, string> = { overdue: 'Vencido', due_soon: 'Próximo a vencer', ok: 'Al día', no_history: 'Sin historial' }
const DUE_STATUS_TONE: Record<DueStatus, string> = {
  overdue: 'bg-status-delayed-bg text-status-delayed',
  due_soon: 'bg-status-progress-bg text-status-progress',
  ok: 'bg-status-active-bg text-status-active',
  no_history: 'bg-gray-100 text-gray-500',
}
const DOC_STATUS_TONE: Record<DocumentStatus, string> = {
  expired: 'bg-red-50 text-red-600',
  expiring_soon: 'bg-status-delayed-bg text-status-delayed',
  valid: 'bg-status-active-bg text-status-active',
  no_expiry: 'bg-gray-100 text-gray-500',
}
const INCIDENT_TYPE_LABEL = Object.fromEntries(INCIDENT_TYPES.map((t) => [t.value, t.label]))
const INCIDENT_SEVERITY_LABEL = Object.fromEntries(INCIDENT_SEVERITIES.map((s) => [s.value, s.label]))
const EXPENSE_CATEGORY_LABEL = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.value, c.label]))

function AlertSection({ icon: Icon, title, count, empty, children }: { icon: typeof Wrench; title: string; count: number; empty: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-surface">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
        <Icon size={16} strokeWidth={2} className="text-gray-500" />
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {count > 0 && <span className="rounded-full bg-status-delayed-bg px-2 py-0.5 text-xs font-medium text-status-delayed">{count}</span>}
      </div>
      {count === 0 ? <p className="px-4 py-4 text-sm text-gray-400">{empty}</p> : <div className="divide-y divide-gray-100">{children}</div>}
    </div>
  )
}

function Row({ to, primary, secondary, tone, toneLabel }: { to: string; primary: string; secondary: string; tone?: string; toneLabel?: string }) {
  return (
    <Link to={to} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">
      <div className="min-w-0">
        <p className="truncate font-medium text-gray-900">{primary}</p>
        <p className="truncate text-xs text-gray-500">{secondary}</p>
      </div>
      {tone && toneLabel && <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{toneLabel}</span>}
    </Link>
  )
}

export function AlertsPage() {
  const { activeOrg } = useOrg()

  const alertsQuery = useQuery({
    queryKey: ['alerts-summary', activeOrg?.id],
    queryFn: () => fetchAlertsSummary(activeOrg!.id),
    enabled: !!activeOrg,
  })

  const data = alertsQuery.data
  const totalAlerts = data
    ? data.maintenanceDue.length + data.lowStockParts.length + data.expiringDocuments.length + data.openIncidents.length + data.pendingExpenses.length
    : 0

  return (
    <PageScroll>
      <div className="flex flex-col gap-4 p-4">
        <div>
          <h1 className="text-lg font-semibold text-ink">Alertas</h1>
          <p className="text-sm text-gray-500">
            Vista agregada de las situaciones reales que necesitan atención hoy: mantenimientos, documentos, inventario, incidentes y
            gastos pendientes. No hay notificaciones automáticas todavía — esta es una vista de consulta.
          </p>
        </div>

        {alertsQuery.isLoading && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        )}

        {alertsQuery.isError && <ErrorState message="No se pudieron cargar las alertas." onRetry={() => void alertsQuery.refetch()} />}

        {data && (
          <>
            <p className="text-sm text-gray-500">{totalAlerts} situaciones que requieren atención.</p>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <AlertSection icon={Wrench} title="Mantenimientos vencidos o próximos" count={data.maintenanceDue.length} empty="Sin mantenimientos vencidos o próximos a vencer.">
                {data.maintenanceDue.slice(0, 20).map((row) => (
                  <Row
                    key={`${row.vehicleId}:${row.maintenanceTypeId}`}
                    to={`/vehiculos/${row.vehicleId}`}
                    primary={`${row.vehicleLabel} · ${row.maintenanceTypeName}`}
                    secondary={row.nextDueDate ? `Vence ${formatDate(row.nextDueDate)}` : row.nextDueOdometer != null ? `Vence a los ${row.nextDueOdometer.toLocaleString('es-MX')} km` : 'Sin fecha estimada'}
                    tone={DUE_STATUS_TONE[row.status]}
                    toneLabel={DUE_STATUS_LABEL[row.status]}
                  />
                ))}
              </AlertSection>

              <AlertSection icon={Package} title="Refacciones con stock bajo" count={data.lowStockParts.length} empty="Sin refacciones por debajo de su mínimo.">
                {data.lowStockParts.slice(0, 20).map((part) => (
                  <Row
                    key={part.id}
                    to={`/refacciones/${part.id}`}
                    primary={part.name}
                    secondary={`${part.quantity_on_hand} en existencia · mínimo ${part.min_stock}`}
                    tone="bg-status-delayed-bg text-status-delayed"
                    toneLabel="Stock bajo"
                  />
                ))}
              </AlertSection>

              <AlertSection icon={FileWarning} title="Documentos por vencer" count={data.expiringDocuments.length} empty="Sin documentos vencidos o próximos a vencer.">
                {data.expiringDocuments.slice(0, 20).map((doc) => (
                  <Row
                    key={`${doc.source}-${doc.id}`}
                    to={doc.linkTo}
                    primary={`${doc.documentType} · ${doc.ownerLabel}`}
                    secondary={`${DOCUMENT_SOURCE_LABEL[doc.source]} · ${doc.expiresAt ? `Vence ${formatDate(doc.expiresAt)}` : 'Sin fecha'}`}
                    tone={DOC_STATUS_TONE[doc.status]}
                    toneLabel={DOCUMENT_STATUS_LABEL[doc.status]}
                  />
                ))}
              </AlertSection>

              <AlertSection icon={AlertTriangle} title="Incidentes abiertos" count={data.openIncidents.length} empty="Sin incidentes abiertos.">
                {data.openIncidents.slice(0, 20).map((incident) => (
                  <Row
                    key={incident.id}
                    to={`/incidentes/${incident.id}`}
                    primary={incident.vehicles ? `${incident.vehicles.economic_number}${incident.vehicles.plate ? ` · ${incident.vehicles.plate}` : ''}` : (INCIDENT_TYPE_LABEL[incident.incident_type] ?? incident.incident_type)}
                    secondary={`${formatDate(incident.incident_date)} · ${INCIDENT_TYPE_LABEL[incident.incident_type] ?? incident.incident_type}`}
                    tone="bg-red-50 text-red-600"
                    toneLabel={INCIDENT_SEVERITY_LABEL[incident.severity] ?? incident.severity}
                  />
                ))}
              </AlertSection>

              <AlertSection icon={Receipt} title="Gastos por aprobar" count={data.pendingExpenses.length} empty="Sin gastos pendientes de aprobación.">
                {data.pendingExpenses.slice(0, 20).map((expense) => (
                  <Row
                    key={expense.id}
                    to={`/gastos/${expense.id}`}
                    primary={formatCurrency(expense.amount)}
                    secondary={`${EXPENSE_CATEGORY_LABEL[expense.category] ?? expense.category} · ${formatDate(expense.expense_date)}`}
                    tone="bg-gray-100 text-gray-500"
                    toneLabel="Pendiente"
                  />
                ))}
              </AlertSection>
            </div>
          </>
        )}
      </div>
    </PageScroll>
  )
}
