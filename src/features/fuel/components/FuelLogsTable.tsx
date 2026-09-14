import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { groupRows } from '@/lib/groupRows'
import { formatCurrency, formatDateTime } from '@/lib/format'
import type { FuelLogSort, FuelLogSortColumn, FuelLogWithRelations } from '@/features/fuel/api/fuelLogsApi'

interface Column {
  key: FuelLogSortColumn
  label: string
}

const COLUMNS: Column[] = [
  { key: 'logged_at', label: 'Fecha' },
  { key: 'liters', label: 'Litros' },
  { key: 'total_cost', label: 'Costo' },
]

function vehicleLabel(vehicle: { economic_number: string; plate: string | null } | null): string {
  if (!vehicle) return '—'
  return vehicle.plate ? `${vehicle.economic_number} · ${vehicle.plate}` : vehicle.economic_number
}

function groupLabel(row: FuelLogWithRelations, groupBy: string): string {
  switch (groupBy) {
    case 'vehicle_id':
      return vehicleLabel(row.vehicles)
    case 'full_tank':
      return row.full_tank ? 'Tanque lleno' : 'Carga parcial'
    default:
      return '—'
  }
}

interface FuelLogsTableProps {
  rows: FuelLogWithRelations[]
  loading: boolean
  error: boolean
  hasFilters: boolean
  sort: FuelLogSort
  onSortChange: (sort: FuelLogSort) => void
  onRetry: () => void
  onCreate: () => void
  groupBy: string | null
}

export function FuelLogsTable({ rows, loading, error, hasFilters, sort, onSortChange, onRetry, onCreate, groupBy }: FuelLogsTableProps) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (error) {
    return <ErrorState message="No se pudieron cargar las cargas de combustible." onRetry={onRetry} />
  }

  if (loading) {
    return <TableSkeleton columns={5} />
  }

  if (rows.length === 0) {
    return hasFilters ? (
      <EmptyState title="Sin resultados" description="Ajusta la búsqueda o los filtros." />
    ) : (
      <EmptyState
        title="Aún no hay cargas de combustible"
        description="Registra la primera carga para empezar a llevar el consumo de la flota."
        action={
          <Can permission="fuel.manage">
            <button
              type="button"
              onClick={onCreate}
              className="rounded-md bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600"
            >
              Nueva carga
            </button>
          </Can>
        }
      />
    )
  }

  function toggleSort(column: FuelLogSortColumn) {
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

  function FuelLogRow({ log }: { log: FuelLogWithRelations }) {
    return (
      <tr onClick={() => navigate(`/combustible/${log.id}`)} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-2 font-medium text-gray-900">{formatDateTime(log.logged_at)}</td>
        <td className="px-4 py-2 text-gray-700">{Number(log.liters).toLocaleString('es-MX')} L</td>
        <td className="px-4 py-2 text-gray-700">{formatCurrency(log.total_cost)}</td>
        <td className="px-4 py-2 text-gray-700">{vehicleLabel(log.vehicles)}</td>
        <td className="px-4 py-2 text-gray-700">{log.drivers ? `${log.drivers.first_name} ${log.drivers.last_name}` : '—'}</td>
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
      <th className="px-4 py-2">Vehículo</th>
      <th className="px-4 py-2">Operador</th>
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
              {!collapsed.has(group.key) && group.rows.map((log) => <FuelLogRow key={log.id} log={log} />)}
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
        {rows.map((log) => (
          <FuelLogRow key={log.id} log={log} />
        ))}
      </tbody>
    </table>
  )
}
