import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { RecordList, type RecordListItem, type RecordListGroup } from '@/components/ui/RecordList'
import { groupRows } from '@/lib/groupRows'
import {
  VEHICLE_STATUSES,
  type VehicleSort,
  type VehicleSortColumn,
  type VehicleWithRelations,
} from '@/features/vehicles/api/vehiclesApi'

const VEHICLE_STATUS_LABELS = Object.fromEntries(VEHICLE_STATUSES.map((s) => [s.value, s.label]))

const STATUS_TONE: Record<string, string> = {
  available: 'bg-status-active-bg text-status-active',
  assigned: 'bg-status-progress-bg text-status-progress',
  in_route: 'bg-status-progress-bg text-status-progress',
  maintenance: 'bg-status-stopped-bg text-status-stopped',
  out_of_service: 'bg-status-delayed-bg text-status-delayed',
  inactive: 'bg-gray-100 text-gray-500',
}

interface Column {
  key: VehicleSortColumn
  label: string
}

const COLUMNS: Column[] = [
  { key: 'economic_number', label: 'Número económico' },
  { key: 'plate', label: 'Placas' },
  { key: 'brand', label: 'Marca / modelo' },
]

function groupLabel(row: VehicleWithRelations, groupBy: string): string {
  switch (groupBy) {
    case 'status':
      return VEHICLE_STATUS_LABELS[row.status] ?? row.status
    case 'vehicle_type_id':
      return row.vehicle_types?.name ?? 'Sin tipo'
    case 'vehicle_group_id':
      return row.vehicle_groups?.name ?? 'Sin grupo'
    case 'location_id':
      return row.locations?.name ?? 'Sin sucursal'
    default:
      return '—'
  }
}

interface VehiclesTableProps {
  rows: VehicleWithRelations[]
  loading: boolean
  error: boolean
  hasFilters: boolean
  sort: VehicleSort
  onSortChange: (sort: VehicleSort) => void
  onRetry: () => void
  onCreate: () => void
  groupBy: string | null
}

export function VehiclesTable({ rows, loading, error, hasFilters, sort, onSortChange, onRetry, onCreate, groupBy }: VehiclesTableProps) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (error) {
    return <ErrorState message="No se pudieron cargar los vehículos." onRetry={onRetry} />
  }

  if (loading) {
    return <TableSkeleton columns={7} />
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

  function toRecord(vehicle: VehicleWithRelations): RecordListItem {
    return {
      id: vehicle.id,
      onClick: () => navigate(`/vehiculos/${vehicle.id}`),
      title: vehicle.economic_number ?? vehicle.plate ?? 'Sin número',
      subtitle: [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || undefined,
      status: { label: VEHICLE_STATUS_LABELS[vehicle.status] ?? vehicle.status, tone: STATUS_TONE[vehicle.status] ?? 'bg-gray-100 text-gray-500' },
      fields: [
        { label: 'Placas', value: vehicle.plate ?? '—' },
        { label: 'Tipo', value: vehicle.vehicle_types?.name ?? '—' },
        { label: 'Operador', value: vehicle.drivers ? `${vehicle.drivers.first_name} ${vehicle.drivers.last_name}` : '—' },
      ],
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

  function VehicleRow({ vehicle }: { vehicle: VehicleWithRelations }) {
    return (
      <tr
        onClick={() => navigate(`/vehiculos/${vehicle.id}`)}
        className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
      >
        <td className="px-4 py-2 font-medium text-gray-900">{vehicle.economic_number ?? '—'}</td>
        <td className="px-4 py-2 text-gray-700">{vehicle.plate ?? '—'}</td>
        <td className="px-4 py-2 text-gray-700">{[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || '—'}</td>
        <td className="px-4 py-2 text-gray-700">{vehicle.vehicle_types?.name ?? '—'}</td>
        <td className="px-4 py-2 text-gray-700">
          {vehicle.drivers ? `${vehicle.drivers.first_name} ${vehicle.drivers.last_name}` : '—'}
        </td>
        <td className="px-4 py-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[vehicle.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {VEHICLE_STATUS_LABELS[vehicle.status] ?? vehicle.status}
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
      <th className="px-4 py-2">Operador</th>
      <th className="px-4 py-2">Estado</th>
    </tr>
  )

  // Desktop: tabla densa 90/10 de siempre (`hidden sm:block`). Celular:
  // `RecordList` — punto 4 de la pasada de UX móvil, NUNCA la misma tabla
  // con scroll horizontal para un registro repetitivo como un vehículo.
  if (groupBy) {
    const groups = groupRows(rows, (r) => groupLabel(r, groupBy), (r) => groupLabel(r, groupBy))
    const recordGroups: RecordListGroup[] = groups.map((g) => ({ key: g.key, label: g.label, items: g.rows.map(toRecord) }))
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
                  {!collapsed.has(group.key) && group.rows.map((vehicle) => <VehicleRow key={vehicle.id} vehicle={vehicle} />)}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <RecordList groups={recordGroups} className="sm:hidden" />
      </>
    )
  }

  return (
    <>
      <div className="hidden sm:block">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">{headerRow}</thead>
          <tbody>
            {rows.map((vehicle) => (
              <VehicleRow key={vehicle.id} vehicle={vehicle} />
            ))}
          </tbody>
        </table>
      </div>
      <RecordList items={rows.map(toRecord)} className="sm:hidden" />
    </>
  )
}
