import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { formatCurrency } from '@/lib/format'
import { JOB_STATUSES, type JobSort, type JobSortColumn, type JobWithRelations } from '@/features/jobs/api/jobsApi'

const STATUS_LABELS = Object.fromEntries(JOB_STATUSES.map((s) => [s.value, s.label]))

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

interface JobsTableProps {
  rows: JobWithRelations[]
  loading: boolean
  error: boolean
  hasFilters: boolean
  sort: JobSort
  onSortChange: (sort: JobSort) => void
  onRetry: () => void
  onCreate: () => void
  onEdit: (job: JobWithRelations) => void
  onDelete: (job: JobWithRelations) => void
}

export function JobsTable({ rows, loading, error, hasFilters, sort, onSortChange, onRetry, onCreate, onEdit, onDelete }: JobsTableProps) {
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

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
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
          <th className="px-4 py-2">Operador</th>
          <th className="px-4 py-2">Monto</th>
          <th className="px-4 py-2">Estado</th>
          <th className="px-4 py-2" />
        </tr>
      </thead>
      <tbody>
        {rows.map((job) => (
          <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-4 py-2 font-medium text-gray-900">{job.job_number ?? job.id.slice(0, 8)}</td>
            <td className="px-4 py-2 text-gray-700">{job.scheduled_date ?? '—'}</td>
            <td className="px-4 py-2 text-gray-700">{job.customers?.name ?? '—'}</td>
            <td className="px-4 py-2 text-gray-700">
              {job.drivers ? `${job.drivers.first_name} ${job.drivers.last_name}` : '—'}
            </td>
            <td className="px-4 py-2 text-gray-700">{formatCurrency(job.amount)}</td>
            <td className="px-4 py-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[job.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {STATUS_LABELS[job.status] ?? job.status}
              </span>
            </td>
            <td className="px-4 py-2 text-right">
              <Can permission="jobs.manage">
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => onEdit(job)} className="text-sm font-medium text-gray-600 hover:text-gray-900">
                    Editar
                  </button>
                  <button type="button" onClick={() => onDelete(job)} className="text-sm font-medium text-red-600 hover:text-red-700">
                    Eliminar
                  </button>
                </div>
              </Can>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
