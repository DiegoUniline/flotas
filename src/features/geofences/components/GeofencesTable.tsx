import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { groupRows } from '@/lib/groupRows'
import type { GeofenceSort, GeofenceSortColumn, GeofenceWithRelations } from '@/features/geofences/api/geofencesApi'

interface Column {
  key: GeofenceSortColumn
  label: string
}

const COLUMNS: Column[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'radius_meters', label: 'Radio (m)' },
]

function groupLabel(row: GeofenceWithRelations, groupBy: string): string {
  switch (groupBy) {
    case 'active':
      return row.active ? 'Activas' : 'Inactivas'
    case 'location_id':
      return row.locations?.name ?? 'Sin sucursal'
    default:
      return '—'
  }
}

interface GeofencesTableProps {
  rows: GeofenceWithRelations[]
  loading: boolean
  error: boolean
  hasFilters: boolean
  sort: GeofenceSort
  onSortChange: (sort: GeofenceSort) => void
  onRetry: () => void
  onCreate: () => void
  groupBy: string | null
}

export function GeofencesTable({ rows, loading, error, hasFilters, sort, onSortChange, onRetry, onCreate, groupBy }: GeofencesTableProps) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (error) {
    return <ErrorState message="No se pudieron cargar las geocercas." onRetry={onRetry} />
  }

  if (loading) {
    return <TableSkeleton columns={4} />
  }

  if (rows.length === 0) {
    return hasFilters ? (
      <EmptyState title="Sin resultados" description="Ajusta la búsqueda o los filtros." />
    ) : (
      <EmptyState
        title="Aún no hay geocercas"
        description="Define la primera zona (radio de entrega, zona restringida, etc.)."
        action={
          <Can permission="geofences.manage">
            <button
              type="button"
              onClick={onCreate}
              className="rounded-md bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600"
            >
              Nueva geocerca
            </button>
          </Can>
        }
      />
    )
  }

  function toggleSort(column: GeofenceSortColumn) {
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

  function GeofenceRow({ geofence }: { geofence: GeofenceWithRelations }) {
    return (
      <tr onClick={() => navigate(`/geocercas/${geofence.id}`)} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-2 font-medium text-gray-900">
          <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: geofence.color }} />
          {geofence.name}
        </td>
        <td className="px-4 py-2 text-gray-700">{geofence.radius_meters.toLocaleString('es-MX')}</td>
        <td className="px-4 py-2 text-gray-700">{geofence.locations?.name ?? '—'}</td>
        <td className="px-4 py-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              geofence.active ? 'bg-status-active-bg text-status-active' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {geofence.active ? 'Activa' : 'Inactiva'}
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
      <th className="px-4 py-2">Sucursal</th>
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
                <td colSpan={4} className="px-4 py-1.5">
                  <button type="button" onClick={() => toggleGroup(group.key)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                    {collapsed.has(group.key) ? <ChevronRight size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
                    {group.label}
                    <span className="font-normal text-gray-400">({group.rows.length})</span>
                  </button>
                </td>
              </tr>
              {!collapsed.has(group.key) && group.rows.map((geofence) => <GeofenceRow key={geofence.id} geofence={geofence} />)}
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
        {rows.map((geofence) => (
          <GeofenceRow key={geofence.id} geofence={geofence} />
        ))}
      </tbody>
    </table>
  )
}
