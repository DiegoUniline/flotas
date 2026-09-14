import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { DRIVER_STATUSES, type Driver, type DriverSort, type DriverSortColumn } from '@/features/drivers/api/driversApi'

const DRIVER_STATUS_LABELS = Object.fromEntries(DRIVER_STATUSES.map((s) => [s.value, s.label]))

const STATUS_TONE: Record<string, string> = {
  active: 'bg-status-active-bg text-status-active',
  on_leave: 'bg-status-stopped-bg text-status-stopped',
  suspended: 'bg-status-delayed-bg text-status-delayed',
  inactive: 'bg-gray-100 text-gray-500',
}

interface Column {
  key: DriverSortColumn
  label: string
}

const COLUMNS: Column[] = [
  { key: 'employee_number', label: 'No. empleado' },
  { key: 'first_name', label: 'Nombre' },
]

interface DriversTableProps {
  rows: Driver[]
  loading: boolean
  error: boolean
  hasFilters: boolean
  sort: DriverSort
  onSortChange: (sort: DriverSort) => void
  onRetry: () => void
  onCreate: () => void
  onEdit: (driver: Driver) => void
  onDelete: (driver: Driver) => void
}

export function DriversTable({
  rows,
  loading,
  error,
  hasFilters,
  sort,
  onSortChange,
  onRetry,
  onCreate,
  onEdit,
  onDelete,
}: DriversTableProps) {
  if (error) {
    return <ErrorState message="No se pudieron cargar los operadores." onRetry={onRetry} />
  }

  if (loading) {
    return <TableSkeleton columns={6} />
  }

  if (rows.length === 0) {
    return hasFilters ? (
      <EmptyState title="Sin resultados" description="Ajusta la búsqueda o los filtros." />
    ) : (
      <EmptyState
        title="Aún no hay operadores"
        description="Registra al primer operador de tu flota."
        action={
          <Can permission="drivers.create">
            <button
              type="button"
              onClick={onCreate}
              className="rounded-md bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600"
            >
              Nuevo operador
            </button>
          </Can>
        }
      />
    )
  }

  function toggleSort(column: DriverSortColumn) {
    if (sort.column === column) {
      onSortChange({ column, direction: sort.direction === 'asc' ? 'desc' : 'asc' })
    } else {
      onSortChange({ column, direction: 'asc' })
    }
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          {COLUMNS.map((column) => (
            <th key={column.key} className="px-4 py-2">
              <button type="button" onClick={() => toggleSort(column.key)} className="flex items-center gap-1 hover:text-gray-900">
                {column.label}
                {sort.column === column.key && (sort.direction === 'asc' ? '↑' : '↓')}
              </button>
            </th>
          ))}
          <th className="px-4 py-2">Teléfono</th>
          <th className="px-4 py-2">Estado</th>
          <th className="px-4 py-2" />
        </tr>
      </thead>
      <tbody>
        {rows.map((driver) => (
          <tr key={driver.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-4 py-2 text-gray-700">{driver.employee_number ?? '—'}</td>
            <td className="px-4 py-2 font-medium text-gray-900">
              {driver.first_name} {driver.last_name}
            </td>
            <td className="px-4 py-2 text-gray-700">{driver.phone ?? '—'}</td>
            <td className="px-4 py-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[driver.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {DRIVER_STATUS_LABELS[driver.status] ?? driver.status}
              </span>
            </td>
            <td className="px-4 py-2 text-right">
              <div className="flex justify-end gap-3">
                <Can permission="drivers.edit">
                  <button type="button" onClick={() => onEdit(driver)} className="text-sm font-medium text-gray-600 hover:text-gray-900">
                    Editar
                  </button>
                </Can>
                <Can permission="drivers.delete">
                  <button type="button" onClick={() => onDelete(driver)} className="text-sm font-medium text-red-600 hover:text-red-700">
                    Eliminar
                  </button>
                </Can>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
