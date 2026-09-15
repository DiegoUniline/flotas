import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Pagination } from '@/components/ui/Pagination'
import { Can } from '@/components/Can'
import { IncidentsTable } from './components/IncidentsTable'
import { useIncidentsQuery } from './hooks/useIncidents'
import {
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  type IncidentFilters,
  type IncidentSort,
} from './api/incidentsApi'
import { computeDateRange } from '@/lib/dateRanges'
import { useListState } from '@/hooks/useListState'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import type { AppliedFilter, FilterFieldDef, GroupFieldDef } from '@/lib/queryFilters'

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: 'incident_type', label: 'Tipo', type: 'select', options: INCIDENT_TYPES.map((t) => ({ value: t.value, label: t.label })) },
  { key: 'severity', label: 'Severidad', type: 'select', options: INCIDENT_SEVERITIES.map((s) => ({ value: s.value, label: s.label })) },
  { key: 'status', label: 'Estado', type: 'select', options: INCIDENT_STATUSES.map((s) => ({ value: s.value, label: s.label })) },
]

const GROUP_FIELDS: GroupFieldDef[] = [
  { key: 'incident_type', label: 'Tipo' },
  { key: 'severity', label: 'Severidad' },
  { key: 'status', label: 'Estado' },
]

export function IncidentsPage() {
  const navigate = useNavigate()
  // `useListState` (en vez de `useState`) persiste cada slice en sessionStorage —
  // al volver de un detalle la lista conserva búsqueda/filtros/orden/página.
  const [search, setSearch] = useListState('incidents.search', '')
  const [dateRange, setDateRange] = useListState('incidents.dateRange', () => computeDateRange('all'))
  const [advanced, setAdvanced] = useListState<AppliedFilter[]>('incidents.advanced', [])
  const [groupBy, setGroupBy] = useListState<string | null>('incidents.groupBy', null)
  const [sort, setSort] = useListState<IncidentSort>('incidents.sort', { column: 'incident_date', direction: 'desc' })
  const [page, setPage] = useListState('incidents.page', 0)
  const scrollRef = useScrollRestoration<HTMLDivElement>('incidents-list')

  const filters: IncidentFilters = { search, dateRange, advanced, groupBy }
  const incidentsQuery = useIncidentsQuery(filters, sort, page)
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Incidentes</h1>
          <p className="text-sm text-gray-500">Accidentes, descomposturas, infracciones y robos registrados en la flota.</p>
        </div>
        <Can permission="alerts.manage">
          <Button onClick={() => navigate('/incidentes/nuevo')}>Nuevo incidente</Button>
        </Can>
      </div>

      <div className="shrink-0">
        <ListToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(0)
          }}
          searchPlaceholder="Buscar por descripción o ubicación..."
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
          <IncidentsTable
            rows={incidentsQuery.data?.rows ?? []}
            loading={incidentsQuery.isLoading}
            error={incidentsQuery.isError}
            hasFilters={hasFilters}
            sort={sort}
            onSortChange={setSort}
            onRetry={() => void incidentsQuery.refetch()}
            onCreate={() => navigate('/incidentes/nuevo')}
            groupBy={groupBy}
          />
        </TableScrollArea>
        {!groupBy && !incidentsQuery.isLoading && !incidentsQuery.isError && (incidentsQuery.data?.rows.length ?? 0) > 0 && (
          <div className="shrink-0">
            <Pagination page={page} pageSize={20} total={incidentsQuery.data?.count ?? 0} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
