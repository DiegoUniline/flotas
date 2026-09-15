import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { groupRows } from '@/lib/groupRows'
import { RecordList, type RecordListItem } from '@/components/ui/RecordList'
import { DEVICE_STATUSES, DEVICE_TYPES, type DeviceSort, type DeviceSortColumn, type DeviceWithRelations } from '@/features/devices/api/devicesApi'

interface Column {
  key: DeviceSortColumn
  label: string
}

const COLUMNS: Column[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'device_type', label: 'Tipo' },
  { key: 'status', label: 'Estado' },
]

const TYPE_LABEL = Object.fromEntries(DEVICE_TYPES.map((t) => [t.value, t.label]))
const STATUS_LABEL = Object.fromEntries(DEVICE_STATUSES.map((s) => [s.value, s.label]))

function groupLabel(row: DeviceWithRelations, groupBy: string): string {
  switch (groupBy) {
    case 'device_type':
      return TYPE_LABEL[row.device_type] ?? row.device_type
    case 'status':
      return STATUS_LABEL[row.status] ?? row.status
    case 'active':
      return row.active ? 'Activos' : 'Inactivos'
    default:
      return '—'
  }
}

interface DevicesTableProps {
  rows: DeviceWithRelations[]
  loading: boolean
  error: boolean
  hasFilters: boolean
  sort: DeviceSort
  onSortChange: (sort: DeviceSort) => void
  onRetry: () => void
  onCreate: () => void
  groupBy: string | null
}

export function DevicesTable({ rows, loading, error, hasFilters, sort, onSortChange, onRetry, onCreate, groupBy }: DevicesTableProps) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (error) {
    return <ErrorState message="No se pudieron cargar los dispositivos." onRetry={onRetry} />
  }

  if (loading) {
    return <TableSkeleton columns={4} />
  }

  if (rows.length === 0) {
    return hasFilters ? (
      <EmptyState title="Sin resultados" description="Ajusta la búsqueda o los filtros." />
    ) : (
      <EmptyState
        title="Aún no hay dispositivos"
        description="Registra el primer dispositivo (rastreador, dashcam, sensor, etc.) de tu inventario."
        action={
          <Can permission="devices.manage">
            <button
              type="button"
              onClick={onCreate}
              className="rounded-md bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600"
            >
              Nuevo dispositivo
            </button>
          </Can>
        }
      />
    )
  }

  function toggleSort(column: DeviceSortColumn) {
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

  function DeviceRow({ device }: { device: DeviceWithRelations }) {
    return (
      <tr onClick={() => navigate(`/dispositivos/${device.id}`)} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-2 font-medium text-gray-900">{device.name}</td>
        <td className="px-4 py-2 text-gray-700">{TYPE_LABEL[device.device_type] ?? device.device_type}</td>
        <td className="px-4 py-2 text-gray-700">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              device.status === 'active' ? 'bg-status-active-bg text-status-active' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {STATUS_LABEL[device.status] ?? device.status}
          </span>
        </td>
        <td className="px-4 py-2 text-gray-700">
          {device.vehicles ? `${device.vehicles.economic_number}${device.vehicles.plate ? ` · ${device.vehicles.plate}` : ''}` : '—'}
        </td>
      </tr>
    )
  }

  function toRecord(device: DeviceWithRelations): RecordListItem {
    return {
      id: device.id,
      onClick: () => navigate(`/dispositivos/${device.id}`),
      title: device.name,
      subtitle: TYPE_LABEL[device.device_type] ?? device.device_type,
      status: {
        label: STATUS_LABEL[device.status] ?? device.status,
        tone: device.status === 'active' ? 'bg-status-active-bg text-status-active' : 'bg-gray-100 text-gray-500',
      },
      fields: [
        { label: 'Vehículo', value: device.vehicles ? `${device.vehicles.economic_number}${device.vehicles.plate ? ` · ${device.vehicles.plate}` : ''}` : '—' },
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
                <td colSpan={4} className="px-4 py-1.5">
                  <button type="button" onClick={() => toggleGroup(group.key)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                    {collapsed.has(group.key) ? <ChevronRight size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
                    {group.label}
                    <span className="font-normal text-gray-400">({group.rows.length})</span>
                  </button>
                </td>
              </tr>
              {!collapsed.has(group.key) && group.rows.map((device) => <DeviceRow key={device.id} device={device} />)}
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
        {rows.map((device) => (
          <DeviceRow key={device.id} device={device} />
        ))}
          </tbody>
        </table>
      </div>
      <RecordList items={rows.map(toRecord)} className="sm:hidden" />
    </>
  )
}
