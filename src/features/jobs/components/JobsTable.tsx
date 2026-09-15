import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { formatCurrency, formatDate } from '@/lib/format'
import { groupRows } from '@/lib/groupRows'
import { RecordList, type RecordListItem } from '@/components/ui/RecordList'
import { JOB_PRIORITIES, JOB_STATUSES, type JobSort, type JobSortColumn, type JobWithRelations } from '@/features/jobs/api/jobsApi'

const STATUS_LABELS = Object.fromEntries(JOB_STATUSES.map((s) => [s.value, s.label]))
const PRIORITY_LABELS = Object.fromEntries(JOB_PRIORITIES.map((p) => [p.value, p.label]))

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-500',
  en_route: 'bg-status-progress-bg text-status-progress',
  arrived: 'bg-status-progress-bg text-status-progress',
  delivered: 'bg-status-active-bg text-status-active',
  partial: 'bg-status-stopped-bg text-status-stopped',
  not_delivered: 'bg-status-delayed-bg text-status-delayed',
  rejected: 'bg-status-delayed-bg text-status-delayed',
  rescheduled: 'bg-status-stopped-bg text-status-stopped',
}

interface Column {
  key: JobSortColumn
  label: string
}

const COLUMNS: Column[] = [
  { key: 'job_number', label: 'Pedido' },
  { key: 'scheduled_date', label: 'Fecha' },
]

function groupLabel(row: JobWithRelations, groupBy: string): string {
  switch (groupBy) {
    case 'status':
      return STATUS_LABELS[row.status] ?? row.status
    case 'priority':
      return PRIORITY_LABELS[row.priority] ?? row.priority
    case 'origin_type':
      return row.origin_type === 'branch' ? 'Lo entregan en sucursal' : 'Pasamos a recoger'
    default:
      return '—'
  }
}

interface JobsTableProps {
  rows: JobWithRelations[]
  loading: boolean
  error: boolean
  hasFilters: boolean
  sort: JobSort
  onSortChange: (sort: JobSort) => void
  onRetry: () => void
  onCreate: () => void
  groupBy: string | null
}

export function JobsTable({ rows, loading, error, hasFilters, sort, onSortChange, onRetry, onCreate, groupBy }: JobsTableProps) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (error) {
    return <ErrorState message="No se pudieron cargar los pedidos." onRetry={onRetry} />
  }

  if (loading) {
    return <TableSkeleton columns={7} />
  }

  if (rows.length === 0) {
    return hasFilters ? (
      <EmptyState title="Sin resultados" description="Ajusta la búsqueda o los filtros." />
    ) : (
      <EmptyState
        title="Aún no hay pedidos"
        description="Crea el primer pedido de tu organización."
        action={
          <Can permission="jobs.manage">
            <button
              type="button"
              onClick={onCreate}
              className="rounded-md bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600"
            >
              Nuevo pedido
            </button>
          </Can>
        }
      />
    )
  }

  function toggleSort(column: JobSortColumn) {
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

  function JobRow({ job }: { job: JobWithRelations }) {
    return (
      <tr onClick={() => navigate(`/pedidos/${job.id}`)} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-2 font-medium text-gray-900">{job.job_number ?? job.id.slice(0, 8)}</td>
        <td className="px-4 py-2 text-gray-700">{formatDate(job.scheduled_date)}</td>
        <td className="px-4 py-2 text-gray-700">{job.customers?.name ?? '—'}</td>
        <td className="px-4 py-2 text-gray-700">{job.receiver_name ?? '—'}</td>
        <td className="px-4 py-2 text-gray-700">{job.drivers ? `${job.drivers.first_name} ${job.drivers.last_name}` : '—'}</td>
        <td className="px-4 py-2 text-gray-700">{formatCurrency(job.amount)}</td>
        <td className="px-4 py-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[job.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {STATUS_LABELS[job.status] ?? job.status}
          </span>
        </td>
      </tr>
    )
  }

  function toRecord(job: JobWithRelations): RecordListItem {
    return {
      id: job.id,
      onClick: () => navigate(`/pedidos/${job.id}`),
      title: job.job_number ?? job.id.slice(0, 8),
      subtitle: job.customers?.name ?? undefined,
      status: { label: STATUS_LABELS[job.status] ?? job.status, tone: STATUS_TONE[job.status] ?? 'bg-gray-100 text-gray-500' },
      fields: [
        { label: 'Fecha', value: formatDate(job.scheduled_date) },
        { label: 'Destinatario', value: job.receiver_name ?? '—' },
        { label: 'Monto', value: formatCurrency(job.amount) },
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
      <th className="px-4 py-2">Cliente</th>
      <th className="px-4 py-2">Destinatario</th>
      <th className="px-4 py-2">Operador</th>
      <th className="px-4 py-2">Monto</th>
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
                <td colSpan={7} className="px-4 py-1.5">
                  <button type="button" onClick={() => toggleGroup(group.key)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                    {collapsed.has(group.key) ? <ChevronRight size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
                    {group.label}
                    <span className="font-normal text-gray-400">({group.rows.length})</span>
                  </button>
                </td>
              </tr>
              {!collapsed.has(group.key) && group.rows.map((job) => <JobRow key={job.id} job={job} />)}
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
        {rows.map((job) => (
          <JobRow key={job.id} job={job} />
        ))}
          </tbody>
        </table>
      </div>
      <RecordList items={rows.map(toRecord)} className="sm:hidden" />
    </>
  )
}
