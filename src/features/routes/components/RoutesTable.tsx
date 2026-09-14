import { useNavigate } from 'react-router-dom'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { ROUTE_STATUSES, type RoutePlanWithRelations } from '@/features/routes/api/routePlansApi'
import { formatDate } from '@/lib/format'

const STATUS_LABELS = Object.fromEntries(ROUTE_STATUSES.map((s) => [s.value, s.label]))
const STATUS_TONE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  planned: 'bg-status-progress-bg text-status-progress',
  in_progress: 'bg-status-stopped-bg text-status-stopped',
  completed: 'bg-status-active-bg text-status-active',
  cancelled: 'bg-status-delayed-bg text-status-delayed',
}

interface RoutesTableProps {
  rows: RoutePlanWithRelations[]
  loading: boolean
  error: boolean
  hasFilters: boolean
  onRetry: () => void
  onCreate: () => void
}

export function RoutesTable({ rows, loading, error, hasFilters, onRetry, onCreate }: RoutesTableProps) {
  const navigate = useNavigate()

  if (error) {
    return <ErrorState message="No se pudieron cargar las rutas." onRetry={onRetry} />
  }

  if (loading) {
    return <TableSkeleton columns={5} />
  }

  if (rows.length === 0) {
    return hasFilters ? (
      <EmptyState title="Sin resultados" description="Ajusta la búsqueda o los filtros." />
    ) : (
      <EmptyState
        title="Sin rutas para esta fecha"
        description="Crea una ruta y agrégale paradas desde los pedidos pendientes."
        action={
          <Can permission="routes.create">
            <button
              type="button"
              onClick={onCreate}
              className="rounded-md bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600"
            >
              Nueva ruta
            </button>
          </Can>
        }
      />
    )
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead className="sticky top-0 z-10">
        <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <th className="px-4 py-2">Ruta</th>
          <th className="px-4 py-2">Fecha</th>
          <th className="px-4 py-2">Operador</th>
          <th className="px-4 py-2">Vehículo</th>
          <th className="px-4 py-2">Estado</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((route) => (
          <tr
            key={route.id}
            onClick={() => navigate(`/rutas/${route.id}`)}
            className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
          >
            <td className="px-4 py-2 font-medium text-gray-900">{route.name ?? route.route_number ?? route.id.slice(0, 8)}</td>
            <td className="px-4 py-2 text-gray-700">{formatDate(route.scheduled_date)}</td>
            <td className="px-4 py-2 text-gray-700">{route.drivers ? `${route.drivers.first_name} ${route.drivers.last_name}` : '—'}</td>
            <td className="px-4 py-2 text-gray-700">{route.vehicles?.economic_number ?? route.vehicles?.plate ?? '—'}</td>
            <td className="px-4 py-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[route.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {STATUS_LABELS[route.status] ?? route.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
