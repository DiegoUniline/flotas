import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { formatDate } from '@/lib/format'
import { MaintenanceDueList } from './MaintenanceDueList'
import { DUE_STATUS_LABEL as STATUS_LABEL, DUE_STATUS_TONE as STATUS_TONE, type DueRow } from '@/features/maintenance/api/maintenanceDueApi'

interface MaintenanceDueTableProps {
  rows: DueRow[]
  loading: boolean
  error: boolean
  onRetry: () => void
}

export function MaintenanceDueTable({ rows, loading, error, onRetry }: MaintenanceDueTableProps) {
  const navigate = useNavigate()

  if (error) {
    return <ErrorState message="No se pudo calcular el estado de mantenimiento." onRetry={onRetry} />
  }

  if (loading) {
    return <TableSkeleton columns={6} />
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Sin tipos de servicio con intervalo"
        description="Define al menos un tipo de servicio con intervalo por km o por días para ver próximos vencimientos."
      />
    )
  }

  return (
    <>
      <div className="hidden sm:block">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2">Vehículo</th>
              <th className="px-4 py-2">Servicio</th>
              <th className="px-4 py-2">Último realizado</th>
              <th className="px-4 py-2">Próximo vencimiento</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.vehicleId}:${row.maintenanceTypeId}`} className="border-b border-gray-100">
                <td className="px-4 py-2 font-medium text-gray-900">{row.vehicleLabel}</td>
                <td className="px-4 py-2 text-gray-700">{row.maintenanceTypeName}</td>
                <td className="px-4 py-2 text-gray-500">
                  {row.lastDoneDate ? formatDate(row.lastDoneDate) : 'Sin registro'}
                  {row.lastDoneOdometer != null && ` · ${Number(row.lastDoneOdometer).toLocaleString('es-MX')} km`}
                </td>
                <td className="px-4 py-2 text-gray-700">
                  {row.nextDueDate && `${formatDate(row.nextDueDate)}`}
                  {row.nextDueDate && row.nextDueOdometer != null && ' · '}
                  {row.nextDueOdometer != null && `${Number(row.nextDueOdometer).toLocaleString('es-MX')} km`}
                  {!row.nextDueDate && row.nextDueOdometer == null && '—'}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[row.status]}`}>{STATUS_LABEL[row.status]}</span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Can permission="maintenance.manage">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/mantenimientos/nuevo?vehicle_id=${row.vehicleId}&maintenance_type_id=${row.maintenanceTypeId}`)
                      }
                      className="text-xs font-medium text-accent-600 hover:text-accent-700"
                    >
                      Programar
                    </button>
                  </Can>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MaintenanceDueList rows={rows} className="sm:hidden" />
    </>
  )
}
