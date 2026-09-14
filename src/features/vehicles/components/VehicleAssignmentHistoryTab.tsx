import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useVehicleAssignmentHistory } from '@/features/vehicles/hooks/useVehicleDetail'

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

export function VehicleAssignmentHistoryTab({ vehicleId }: { vehicleId: string }) {
  const historyQuery = useVehicleAssignmentHistory(vehicleId)

  if (historyQuery.isLoading) return <Skeleton className="my-4 h-16" />

  if (!historyQuery.data || historyQuery.data.length === 0) {
    return (
      <div className="py-4">
        <EmptyState title="Sin historial" description="Este vehículo aún no ha tenido operadores asignados." />
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2 py-4">
      {historyQuery.data.map((entry) => (
        <li key={entry.id} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 text-sm">
          <div>
            <p className="font-medium text-gray-900">
              {entry.drivers ? `${entry.drivers.first_name} ${entry.drivers.last_name}` : 'Operador eliminado'}
            </p>
            <p className="text-xs text-gray-500">
              {formatDateTime(entry.starts_at)} {entry.ends_at ? `→ ${formatDateTime(entry.ends_at)}` : ''}
            </p>
          </div>
          {entry.active && <span className="rounded-full bg-status-active-bg px-2 py-0.5 text-xs font-medium text-status-active">Actual</span>}
        </li>
      ))}
    </ul>
  )
}
