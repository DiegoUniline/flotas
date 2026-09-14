import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { groupRows } from '@/lib/groupRows'
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

function groupLabel(row: Driver, groupBy: string): string {
  switch (groupBy) {
    case 'status':
      return DRIVER_STATUS_LABELS[row.status] ?? row.status
    case 'active':
      return row.active ? 'Activos' : 'Inactivos'
    default:
      return '—'
  }
}

interface DriversTableProps {
  rows: Driver[]
  loading: boolean
  error: boolean
  hasFilters: boolean
  sort: DriverSort
  onSortChange: (sort: DriverSort) => void
  onRetry: () => void
  onCreate: () => void
  groupBy: string | null
}

export function DriversTable({ rows, loading, error, hasFilters, sort, onSortChange, onRetry, onCreate, groupBy }: DriversTableProps) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (error) {
    return <ErrorState message="No se pudieron cargar los operadores." onRetry={onRetry} />
  }

  if (loading) {
    return <TableSkeleton columns={5} />
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

  function toggleGroup(key: string) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function DriverRow({ driver }: { driver: Driver }) {
    return (
      <tr onClick={() => navigate(`/operadores/${driver.id}`)} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
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
      <th className="px-4 py-2">Teléfono</th>
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
              {!collapsed.has(group.key) && group.rows.map((driver) => <DriverRow key={driver.id} driver={driver} />)}
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
        {rows.map((driver) => (
          <DriverRow key={driver.id} driver={driver} />
        ))}
      </tbody>
    </table>
  )
}
