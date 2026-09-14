import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { VEHICLE_TYPES, type Vehicle, type VehicleSort, type VehicleSortColumn } from '@/features/vehicles/api/vehiclesApi'

const VEHICLE_TYPE_LABELS = Object.fromEntries(VEHICLE_TYPES.map((t) => [t.value, t.label]))

interface Column {
  key: VehicleSortColumn
  label: string
}

const COLUMNS: Column[] = [
  { key: 'economic_number', label: 'Número económico' },
  { key: 'plate', label: 'Placas' },
  { key: 'brand', label: 'Marca / modelo' },
]

interface VehiclesTableProps {
  rows: Vehicle[]
  loading: boolean
  error: boolean
  hasFilters: boolean
  sort: VehicleSort
  onSortChange: (sort: VehicleSort) => void
  onRetry: () => void
  onCreate: () => void
  onEdit: (vehicle: Vehicle) => void
  onDelete: (vehicle: Vehicle) => void
}

export function VehiclesTable({
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
}: VehiclesTableProps) {
  if (error) {
    return <ErrorState message="No se pudieron cargar los vehículos." onRetry={onRetry} />
  }

  if (loading) {
    return <TableSkeleton columns={6} />
  }

  if (rows.length === 0) {
    return hasFilters ? (
      <EmptyState title="Sin resultados" description="Ajusta la búsqueda o los filtros." />
    ) : (
      <EmptyState
        title="Aún no hay vehículos"
        description="Registra el primer vehículo de tu flota."
        action={
          <Can permission="vehicles.create">
            <button
              type="button"
              onClick={onCreate}
              className="rounded-md bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600"
            >
              Nuevo vehículo
            </button>
          </Can>
        }
      />
    )
  }

  function toggleSort(column: VehicleSortColumn) {
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
              <button
                type="button"
                onClick={() => toggleSort(column.key)}
                className="flex items-center gap-1 hover:text-gray-900"
              >
                {column.label}
                {sort.column === column.key && (sort.direction === 'asc' ? '↑' : '↓')}
              </button>
            </th>
          ))}
          <th className="px-4 py-2">Tipo</th>
          <th className="px-4 py-2">Estado</th>
          <th className="px-4 py-2" />
        </tr>
      </thead>
      <tbody>
        {rows.map((vehicle) => (
          <tr key={vehicle.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-4 py-2 font-medium text-gray-900">{vehicle.economic_number ?? '—'}</td>
            <td className="px-4 py-2 text-gray-700">{vehicle.plate ?? '—'}</td>
            <td className="px-4 py-2 text-gray-700">
              {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || '—'}
            </td>
            <td className="px-4 py-2 text-gray-700">
              {VEHICLE_TYPE_LABELS[vehicle.vehicle_type] ?? vehicle.vehicle_type}
            </td>
            <td className="px-4 py-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  vehicle.active ? 'bg-status-active-bg text-status-active' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {vehicle.active ? 'Activo' : 'Inactivo'}
              </span>
            </td>
            <td className="px-4 py-2 text-right">
              <div className="flex justify-end gap-3">
                <Can permission="vehicles.edit">
                  <button
                    type="button"
                    onClick={() => onEdit(vehicle)}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    Editar
                  </button>
                </Can>
                <Can permission="vehicles.delete">
                  <button
                    type="button"
                    onClick={() => onDelete(vehicle)}
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                  >
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
