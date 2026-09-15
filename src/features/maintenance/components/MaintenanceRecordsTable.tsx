import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { groupRows } from '@/lib/groupRows'
import { RecordList, type RecordListItem } from '@/components/ui/RecordList'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  MAINTENANCE_RECORD_STATUSES,
  type MaintenanceRecordSort,
  type MaintenanceRecordSortColumn,
  type MaintenanceRecordWithRelations,
} from '@/features/maintenance/api/maintenanceRecordsApi'

interface Column {
  key: MaintenanceRecordSortColumn
  label: string
}

const COLUMNS: Column[] = [
  { key: 'scheduled_date', label: 'Programado' },
  { key: 'completed_date', label: 'Completado' },
  { key: 'cost', label: 'Costo' },
]

const STATUS_LABEL = Object.fromEntries(MAINTENANCE_RECORD_STATUSES.map((s) => [s.value, s.label]))
const STATUS_TONE: Record<string, string> = {
  scheduled: 'bg-status-progress-bg text-status-progress',
  completed: 'bg-status-active-bg text-status-active',
  cancelled: 'bg-gray-100 text-gray-500',
}

function vehicleLabel(vehicle: { economic_number: string; plate: string | null } | null): string {
  if (!vehicle) return '—'
  return vehicle.plate ? `${vehicle.economic_number} · ${vehicle.plate}` : vehicle.economic_number
}

function groupLabel(row: MaintenanceRecordWithRelations, groupBy: string): string {
  switch (groupBy) {
    case 'vehicle_id':
      return vehicleLabel(row.vehicles)
    case 'status':
      return STATUS_LABEL[row.status] ?? row.status
    case 'maintenance_type_id':
      return row.maintenance_types?.name ?? 'Sin tipo'
    default:
      return '—'
  }
}

interface MaintenanceRecordsTableProps {
  rows: MaintenanceRecordWithRelations[]
  loading: boolean
  error: boolean
  hasFilters: boolean
  sort: MaintenanceRecordSort
  onSortChange: (sort: MaintenanceRecordSort) => void
  onRetry: () => void
  onCreate: () => void
  groupBy: string | null
}

export function MaintenanceRecordsTable({ rows, loading, error, hasFilters, sort, onSortChange, onRetry, onCreate, groupBy }: MaintenanceRecordsTableProps) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (error) {
    return <ErrorState message="No se pudieron cargar los servicios de mantenimiento." onRetry={onRetry} />
  }

  if (loading) {
    return <TableSkeleton columns={6} />
  }

  if (rows.length === 0) {
    return hasFilters ? (
      <EmptyState title="Sin resultados" description="Ajusta la búsqueda o los filtros." />
    ) : (
      <EmptyState
        title="Aún no hay servicios de mantenimiento"
        description="Programa o registra el primer servicio de la flota."
        action={
          <Can permission="maintenance.manage">
            <button
              type="button"
              onClick={onCreate}
              className="rounded-md bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600"
            >
              Nuevo servicio
            </button>
          </Can>
        }
      />
    )
  }

  function toggleSort(column: MaintenanceRecordSortColumn) {
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

  function RecordRow({ record }: { record: MaintenanceRecordWithRelations }) {
    return (
      <tr onClick={() => navigate(`/mantenimientos/${record.id}`)} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-2 font-medium text-gray-900">{formatDate(record.scheduled_date)}</td>
        <td className="px-4 py-2 text-gray-700">{formatDate(record.completed_date)}</td>
        <td className="px-4 py-2 text-gray-700">{formatCurrency(record.cost)}</td>
        <td className="px-4 py-2 text-gray-700">{vehicleLabel(record.vehicles)}</td>
        <td className="px-4 py-2 text-gray-700">{record.maintenance_types?.name ?? '—'}</td>
        <td className="px-4 py-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[record.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {STATUS_LABEL[record.status] ?? record.status}
          </span>
        </td>
      </tr>
    )
  }

  function toRecord(record: MaintenanceRecordWithRelations): RecordListItem {
    return {
      id: record.id,
      onClick: () => navigate(`/mantenimientos/${record.id}`),
      title: vehicleLabel(record.vehicles),
      subtitle: record.maintenance_types?.name ?? undefined,
      status: { label: STATUS_LABEL[record.status] ?? record.status, tone: STATUS_TONE[record.status] ?? 'bg-gray-100 text-gray-500' },
      fields: [
        { label: 'Programado', value: formatDate(record.scheduled_date) },
        { label: 'Completado', value: formatDate(record.completed_date) },
        { label: 'Costo', value: formatCurrency(record.cost) },
      ],
    }
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
      <th className="px-4 py-2">Servicio</th>
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
      <>
        <div className="hidden sm:block">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10">{headerRow}</thead>
            <tbody>
          {groups.map((group) => (
            <Fragment key={group.key}>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <td colSpan={6} className="px-4 py-1.5">
                  <button type="button" onClick={() => toggleGroup(group.key)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                    {collapsed.has(group.key) ? <ChevronRight size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
                    {group.label}
                    <span className="font-normal text-gray-400">({group.rows.length})</span>
                  </button>
                </td>
              </tr>
              {!collapsed.has(group.key) && group.rows.map((record) => <RecordRow key={record.id} record={record} />)}
            </Fragment>
          ))}
            </tbody>
          </table>
        </div>
        <RecordList
          groups={groups.map((g) => ({ key: g.key, label: g.label, items: g.rows.map(toRecord) }))}
          className="sm:hidden"
        />
      </>
    )
  }

  return (
    <>
      <div className="hidden sm:block">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">{headerRow}</thead>
          <tbody>
        {rows.map((record) => (
          <RecordRow key={record.id} record={record} />
        ))}
          </tbody>
        </table>
      </div>
      <RecordList items={rows.map(toRecord)} className="sm:hidden" />
    </>
  )
}
