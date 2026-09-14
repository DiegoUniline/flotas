import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { LOCATION_TYPES, type Location, type LocationSort, type LocationSortColumn } from '@/features/locations/api/locationsApi'

const LOCATION_TYPE_LABELS = Object.fromEntries(LOCATION_TYPES.map((t) => [t.value, t.label]))

interface Column {
  key: LocationSortColumn
  label: string
}

const COLUMNS: Column[] = [
  { key: 'code', label: 'Código' },
  { key: 'name', label: 'Nombre' },
  { key: 'city', label: 'Ciudad' },
]

interface LocationsTableProps {
  rows: Location[]
  loading: boolean
  error: boolean
  hasFilters: boolean
  sort: LocationSort
  onSortChange: (sort: LocationSort) => void
  onRetry: () => void
  onCreate: () => void
  onEdit: (location: Location) => void
  onDelete: (location: Location) => void
}

export function LocationsTable({
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
}: LocationsTableProps) {
  if (error) {
    return <ErrorState message="No se pudieron cargar las sucursales." onRetry={onRetry} />
  }

  if (loading) {
    return <TableSkeleton columns={6} />
  }

  if (rows.length === 0) {
    return hasFilters ? (
      <EmptyState title="Sin resultados" description="Ajusta la búsqueda o los filtros." />
    ) : (
      <EmptyState
        title="Aún no hay sucursales"
        description="Crea la primera sucursal de tu organización."
        action={
          <Can permission="locations.manage">
            <button
              type="button"
              onClick={onCreate}
              className="rounded-md bg-gray-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Nueva sucursal
            </button>
          </Can>
        }
      />
    )
  }

  function toggleSort(column: LocationSortColumn) {
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
        {rows.map((location) => (
          <tr key={location.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-4 py-2 text-gray-700">{location.code ?? '—'}</td>
            <td className="px-4 py-2 font-medium text-gray-900">{location.name}</td>
            <td className="px-4 py-2 text-gray-700">{location.city ?? '—'}</td>
            <td className="px-4 py-2 text-gray-700">
              {LOCATION_TYPE_LABELS[location.location_type] ?? location.location_type}
            </td>
            <td className="px-4 py-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  location.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {location.active ? 'Activa' : 'Inactiva'}
              </span>
            </td>
            <td className="px-4 py-2 text-right">
              <Can permission="locations.manage">
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => onEdit(location)}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(location)}
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </Can>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
