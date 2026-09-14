import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { groupRows } from '@/lib/groupRows'
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

function groupLabel(row: Location, groupBy: string): string {
  switch (groupBy) {
    case 'location_type':
      return LOCATION_TYPE_LABELS[row.location_type] ?? row.location_type
    case 'active':
      return row.active ? 'Activas' : 'Inactivas'
    case 'state':
      return row.state ?? 'Sin estado'
    default:
      return '—'
  }
}

interface LocationsTableProps {
  rows: Location[]
  loading: boolean
  error: boolean
  hasFilters: boolean
  sort: LocationSort
  onSortChange: (sort: LocationSort) => void
  onRetry: () => void
  onCreate: () => void
  groupBy: string | null
}

export function LocationsTable({ rows, loading, error, hasFilters, sort, onSortChange, onRetry, onCreate, groupBy }: LocationsTableProps) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

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
              className="rounded-md bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600"
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

  function toggleGroup(key: string) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function LocationRow({ location }: { location: Location }) {
    return (
      <tr onClick={() => navigate(`/sucursales/${location.id}`)} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-2 text-gray-700">{location.code ?? '—'}</td>
        <td className="px-4 py-2 font-medium text-gray-900">{location.name}</td>
        <td className="px-4 py-2 text-gray-700">{location.city ?? '—'}</td>
        <td className="px-4 py-2 text-gray-700">{LOCATION_TYPE_LABELS[location.location_type] ?? location.location_type}</td>
        <td className="px-4 py-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              location.active ? 'bg-status-active-bg text-status-active' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {location.active ? 'Activa' : 'Inactiva'}
          </span>
        </td>
      </tr>
    )
  }

  const headerRow = (
    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
      {COLUMNS.map((column) => (
        <th key={column.key} className="px-4 py-2">
          <button type="button" onClick={() => toggleSort(column.key)} className="flex items-center gap-1 hover:text-gray-900">
            {column.label}
            {sort.column === column.key && (sort.direction === 'asc' ? '↑' : '↓')}
          </button>
        </th>
      ))}
      <th className="px-4 py-2">Tipo</th>
      <th className="px-4 py-2">Estado</th>
    </tr>
  )

  if (groupBy) {
    const groups = groupRows(
      rows,
      (r) => groupLabel(r, groupBy),
      (r) => groupLabel(r, groupBy),
    )
    return (
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10">{headerRow}</thead>
        <tbody>
          {groups.map((group) => (
            <Fragment key={group.key}>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <td colSpan={5} className="px-4 py-1.5">
                  <button type="button" onClick={() => toggleGroup(group.key)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                    {collapsed.has(group.key) ? <ChevronRight size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
                    {group.label}
                    <span className="font-normal text-gray-400">({group.rows.length})</span>
                  </button>
                </td>
              </tr>
              {!collapsed.has(group.key) && group.rows.map((location) => <LocationRow key={location.id} location={location} />)}
            </Fragment>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead className="sticky top-0 z-10">{headerRow}</thead>
      <tbody>
        {rows.map((location) => (
          <LocationRow key={location.id} location={location} />
        ))}
      </tbody>
    </table>
  )
}
