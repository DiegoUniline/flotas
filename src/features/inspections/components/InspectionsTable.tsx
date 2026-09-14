import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { groupRows } from '@/lib/groupRows'
import { formatDateTime } from '@/lib/format'
import { INSPECTION_RESULTS, type InspectionSort, type InspectionSortColumn, type InspectionWithRelations } from '@/features/inspections/api/inspectionsApi'

interface Column {
  key: InspectionSortColumn
  label: string
}

const COLUMNS: Column[] = [{ key: 'performed_at', label: 'Fecha' }]

const RESULT_LABEL = Object.fromEntries(INSPECTION_RESULTS.map((r) => [r.value, r.label]))
const RESULT_TONE: Record<string, string> = {
  pass: 'bg-status-active-bg text-status-active',
  fail: 'bg-status-delayed-bg text-status-delayed',
}

function vehicleLabel(vehicle: { economic_number: string; plate: string | null } | null): string {
  if (!vehicle) return '—'
  return vehicle.plate ? `${vehicle.economic_number} · ${vehicle.plate}` : vehicle.economic_number
}

function groupLabel(row: InspectionWithRelations, groupBy: string): string {
  switch (groupBy) {
    case 'vehicle_id':
      return vehicleLabel(row.vehicles)
    case 'overall_result':
      return RESULT_LABEL[row.overall_result] ?? row.overall_result
    case 'template_id':
      return row.inspection_templates?.name ?? 'Sin plantilla'
    default:
      return '—'
  }
}

interface InspectionsTableProps {
  rows: InspectionWithRelations[]
  loading: boolean
  error: boolean
  hasFilters: boolean
  sort: InspectionSort
  onSortChange: (sort: InspectionSort) => void
  onRetry: () => void
  onCreate: () => void
  groupBy: string | null
}

export function InspectionsTable({ rows, loading, error, hasFilters, sort, onSortChange, onRetry, onCreate, groupBy }: InspectionsTableProps) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (error) {
    return <ErrorState message="No se pudieron cargar las inspecciones." onRetry={onRetry} />
  }

  if (loading) {
    return <TableSkeleton columns={5} />
  }

  if (rows.length === 0) {
    return hasFilters ? (
      <EmptyState title="Sin resultados" description="Ajusta la búsqueda o los filtros." />
    ) : (
      <EmptyState
        title="Aún no hay inspecciones"
        description="Registra la primera inspección de un vehículo."
        action={
          <Can permission="inspections.perform">
            <button
              type="button"
              onClick={onCreate}
              className="rounded-md bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600"
            >
              Nueva inspección
            </button>
          </Can>
        }
      />
    )
  }

  function toggleSort(column: InspectionSortColumn) {
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

  function InspectionRow({ inspection }: { inspection: InspectionWithRelations }) {
    return (
      <tr onClick={() => navigate(`/inspecciones/${inspection.id}`)} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-2 font-medium text-gray-900">{formatDateTime(inspection.performed_at)}</td>
        <td className="px-4 py-2 text-gray-700">{vehicleLabel(inspection.vehicles)}</td>
        <td className="px-4 py-2 text-gray-700">{inspection.drivers ? `${inspection.drivers.first_name} ${inspection.drivers.last_name}` : '—'}</td>
        <td className="px-4 py-2 text-gray-700">{inspection.inspection_templates?.name ?? '—'}</td>
        <td className="px-4 py-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RESULT_TONE[inspection.overall_result] ?? 'bg-gray-100 text-gray-500'}`}>
            {RESULT_LABEL[inspection.overall_result] ?? inspection.overall_result}
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
      <th className="px-4 py-2">Vehículo</th>
      <th className="px-4 py-2">Operador</th>
      <th className="px-4 py-2">Plantilla</th>
      <th className="px-4 py-2">Resultado</th>
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
              {!collapsed.has(group.key) && group.rows.map((inspection) => <InspectionRow key={inspection.id} inspection={inspection} />)}
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
        {rows.map((inspection) => (
          <InspectionRow key={inspection.id} inspection={inspection} />
        ))}
      </tbody>
    </table>
  )
}
