import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Pagination } from '@/components/ui/Pagination'
import { Can } from '@/components/Can'
import { JobsTable } from './components/JobsTable'
import { useJobsQuery } from './hooks/useJobs'
import { JOB_PRIORITIES, JOB_STATUSES, ORIGIN_TYPES, type JobFilters, type JobSort } from './api/jobsApi'
import { computeDateRange } from '@/lib/dateRanges'
import { useListState } from '@/hooks/useListState'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import type { AppliedFilter, FilterFieldDef, GroupFieldDef } from '@/lib/queryFilters'

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: 'status', label: 'Estado', type: 'select', options: JOB_STATUSES.map((s) => ({ value: s.value, label: s.label })) },
  { key: 'priority', label: 'Prioridad', type: 'select', options: JOB_PRIORITIES.map((p) => ({ value: p.value, label: p.label })) },
  { key: 'origin_type', label: 'Recolección', type: 'select', options: ORIGIN_TYPES.map((o) => ({ value: o.value, label: o.label })) },
  { key: 'sender_name', label: 'Remitente', type: 'text' },
  { key: 'receiver_name', label: 'Destinatario', type: 'text' },
]

const GROUP_FIELDS: GroupFieldDef[] = [
  { key: 'status', label: 'Estado' },
  { key: 'priority', label: 'Prioridad' },
  { key: 'origin_type', label: 'Recolección' },
]

export function JobsPage() {
  const navigate = useNavigate()
  // `useListState` (en vez de `useState`) persiste cada slice en sessionStorage —
  // al volver de un detalle la lista conserva búsqueda/filtros/orden/página.
  const [search, setSearch] = useListState('jobs.search', '')
  const [dateRange, setDateRange] = useListState('jobs.dateRange', () => computeDateRange('all'))
  const [advanced, setAdvanced] = useListState<AppliedFilter[]>('jobs.advanced', [])
  const [groupBy, setGroupBy] = useListState<string | null>('jobs.groupBy', null)
  const [sort, setSort] = useListState<JobSort>('jobs.sort', { column: 'scheduled_date', direction: 'desc' })
  const [page, setPage] = useListState('jobs.page', 0)
  const scrollRef = useScrollRestoration<HTMLDivElement>('jobs-list')

  const filters: JobFilters = { search, dateRange, advanced, groupBy }
  const jobsQuery = useJobsQuery(filters, sort, page)
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Pedidos</h1>
          <p className="text-sm text-gray-500">Guías de envío: remitente, destinatario, recolección y entrega.</p>
        </div>
        <Can permission="jobs.manage">
          <Button onClick={() => navigate('/pedidos/nuevo')}>Nuevo pedido</Button>
        </Can>
      </div>

      <div className="shrink-0">
        <ListToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(0)
          }}
          searchPlaceholder="Buscar por número, remitente o destinatario..."
          dateRange={dateRange}
          onDateRangeChange={(v) => {
            setDateRange(v)
            setPage(0)
          }}
          filters={advanced}
          onFiltersChange={(f) => {
            setAdvanced(f)
            setPage(0)
          }}
          filterFields={FILTER_FIELDS}
          groupFields={GROUP_FIELDS}
          groupBy={groupBy}
          onGroupByChange={(g) => {
            setGroupBy(g)
            setPage(0)
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-surface">
        <TableScrollArea ref={scrollRef}>
          <JobsTable
            rows={jobsQuery.data?.rows ?? []}
            loading={jobsQuery.isLoading}
            error={jobsQuery.isError}
            hasFilters={hasFilters}
            sort={sort}
            onSortChange={setSort}
            onRetry={() => void jobsQuery.refetch()}
            onCreate={() => navigate('/pedidos/nuevo')}
            groupBy={groupBy}
          />
        </TableScrollArea>
        {!groupBy && !jobsQuery.isLoading && !jobsQuery.isError && (jobsQuery.data?.rows.length ?? 0) > 0 && (
          <div className="shrink-0">
            <Pagination page={page} pageSize={20} total={jobsQuery.data?.count ?? 0} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
