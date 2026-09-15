import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { groupRows } from '@/lib/groupRows'
import { RecordList, type RecordListItem } from '@/components/ui/RecordList'
import { formatDate } from '@/lib/format'
import {
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  type IncidentSort,
  type IncidentSortColumn,
  type IncidentWithRelations,
} from '@/features/incidents/api/incidentsApi'

interface Column {
  key: IncidentSortColumn
  label: string
}

const COLUMNS: Column[] = [
  { key: 'incident_date', label: 'Fecha' },
  { key: 'severity', label: 'Severidad' },
  { key: 'status', label: 'Estado' },
]

const TYPE_LABEL = Object.fromEntries(INCIDENT_TYPES.map((t) => [t.value, t.label]))
const SEVERITY_LABEL = Object.fromEntries(INCIDENT_SEVERITIES.map((s) => [s.value, s.label]))
const STATUS_LABEL = Object.fromEntries(INCIDENT_STATUSES.map((s) => [s.value, s.label]))

const SEVERITY_TONE: Record<string, string> = {
  low: 'bg-gray-100 text-gray-500',
  medium: 'bg-status-delayed-bg text-status-delayed',
  high: 'bg-red-50 text-red-600',
}

const STATUS_TONE: Record<string, string> = {
  open: 'bg-status-delayed-bg text-status-delayed',
  resolved: 'bg-status-active-bg text-status-active',
}

function vehicleLabel(vehicle: { economic_number: string; plate: string | null } | null): string {
  if (!vehicle) return '—'
  return vehicle.plate ? `${vehicle.economic_number} · ${vehicle.plate}` : vehicle.economic_number
}

function driverLabel(driver: { first_name: string; last_name: string } | null): string {
  if (!driver) return '—'
  return `${driver.first_name} ${driver.last_name}`
}

function groupLabel(row: IncidentWithRelations, groupBy: string): string {
  switch (groupBy) {
    case 'incident_type':
      return TYPE_LABEL[row.incident_type] ?? row.incident_type
    case 'severity':
      return SEVERITY_LABEL[row.severity] ?? row.severity
    case 'status':
      return STATUS_LABEL[row.status] ?? row.status
    default:
      return '—'
  }
}

interface IncidentsTableProps {
  rows: IncidentWithRelations[]
  loading: boolean
  error: boolean
  hasFilters: boolean
  sort: IncidentSort
  onSortChange: (sort: IncidentSort) => void
  onRetry: () => void
  onCreate: () => void
  groupBy: string | null
}

export function IncidentsTable({ rows, loading, error, hasFilters, sort, onSortChange, onRetry, onCreate, groupBy }: IncidentsTableProps) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (error) {
    return <ErrorState message="No se pudieron cargar los incidentes." onRetry={onRetry} />
  }

  if (loading) {
    return <TableSkeleton columns={6} />
  }

  if (rows.length === 0) {
    return hasFilters ? (
      <EmptyState title="Sin resultados" description="Ajusta la búsqueda o los filtros." />
    ) : (
      <EmptyState
        title="Aún no hay incidentes"
        description="Registra el primer incidente (accidente, descompostura, infracción, robo) de la flota."
        action={
          <Can permission="alerts.manage">
            <button
              type="button"
              onClick={onCreate}
              className="rounded-md bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600"
            >
              Nuevo incidente
            </button>
          </Can>
        }
      />
    )
  }

  function toggleSort(column: IncidentSortColumn) {
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

  function IncidentRow({ incident }: { incident: IncidentWithRelations }) {
    return (
      <tr onClick={() => navigate(`/incidentes/${incident.id}`)} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-2 font-medium text-gray-900">{formatDate(incident.incident_date)}</td>
        <td className="px-4 py-2 text-gray-700">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_TONE[incident.severity] ?? 'bg-gray-100 text-gray-500'}`}>
            {SEVERITY_LABEL[incident.severity] ?? incident.severity}
          </span>
        </td>
        <td className="px-4 py-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[incident.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {STATUS_LABEL[incident.status] ?? incident.status}
          </span>
        </td>
        <td className="px-4 py-2 text-gray-700">{TYPE_LABEL[incident.incident_type] ?? incident.incident_type}</td>
        <td className="px-4 py-2 text-gray-700">{vehicleLabel(incident.vehicles)}</td>
        <td className="px-4 py-2 text-gray-700">{driverLabel(incident.drivers)}</td>
      </tr>
    )
  }

  function toRecord(incident: IncidentWithRelations): RecordListItem {
    return {
      id: incident.id,
      onClick: () => navigate(`/incidentes/${incident.id}`),
      title: TYPE_LABEL[incident.incident_type] ?? incident.incident_type,
      subtitle: formatDate(incident.incident_date),
      status: { label: STATUS_LABEL[incident.status] ?? incident.status, tone: STATUS_TONE[incident.status] ?? 'bg-gray-100 text-gray-500' },
      fields: [
        { label: 'Severidad', value: SEVERITY_LABEL[incident.severity] ?? incident.severity },
        { label: 'Vehículo', value: vehicleLabel(incident.vehicles) },
        { label: 'Operador', value: driverLabel(incident.drivers) },
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
      <th className="px-4 py-2">Tipo</th>
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
              {!collapsed.has(group.key) && group.rows.map((incident) => <IncidentRow key={incident.id} incident={incident} />)}
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
        {rows.map((incident) => (
          <IncidentRow key={incident.id} incident={incident} />
        ))}
          </tbody>
        </table>
      </div>
      <RecordList items={rows.map(toRecord)} className="sm:hidden" />
    </>
  )
}
