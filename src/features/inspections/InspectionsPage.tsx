import { useNavigate } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Pagination } from '@/components/ui/Pagination'
import { Can } from '@/components/Can'
import { InspectionsTable } from './components/InspectionsTable'
import { useInspectionsQuery } from './hooks/useInspections'
import { INSPECTION_RESULTS, type InspectionFilters, type InspectionSort } from './api/inspectionsApi'
import { computeDateRange } from '@/lib/dateRanges'
import { useListState } from '@/hooks/useListState'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import type { AppliedFilter, FilterFieldDef, GroupFieldDef } from '@/lib/queryFilters'

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: 'overall_result', label: 'Resultado', type: 'select', options: INSPECTION_RESULTS.map((r) => ({ value: r.value, label: r.label })) },
]

const GROUP_FIELDS: GroupFieldDef[] = [
  { key: 'vehicle_id', label: 'Vehículo' },
  { key: 'overall_result', label: 'Resultado' },
  { key: 'template_id', label: 'Plantilla' },
]

export function InspectionsPage() {
  const navigate = useNavigate()
  // `useListState` (en vez de `useState`) persiste cada slice en sessionStorage —
  // al volver de un detalle la lista conserva búsqueda/filtros/orden/página.
  const [search, setSearch] = useListState('inspections.search', '')
  const [dateRange, setDateRange] = useListState('inspections.dateRange', () => computeDateRange('this_month'))
  const [advanced, setAdvanced] = useListState<AppliedFilter[]>('inspections.advanced', [])
  const [groupBy, setGroupBy] = useListState<string | null>('inspections.groupBy', null)
  const [sort, setSort] = useListState<InspectionSort>('inspections.sort', { column: 'performed_at', direction: 'desc' })
  const [page, setPage] = useListState('inspections.page', 0)
  const scrollRef = useScrollRestoration<HTMLDivElement>('inspections-list')

  const filters: InspectionFilters = { search, dateRange, advanced, groupBy }
  const inspectionsQuery = useInspectionsQuery(filters, sort, page)
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Inspecciones</h1>
          <p className="text-sm text-gray-500">Checklists de inspección aplicados a los vehículos.</p>
        </div>
        <div className="flex items-center gap-3">
          <Can permission="inspections.perform">
            <button
              type="button"
              onClick={() => navigate('/inspecciones/plantillas')}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-ink"
            >
              <ClipboardList size={15} strokeWidth={2} />
              Plantillas
            </button>
          </Can>
          <Can permission="inspections.perform">
            <Button onClick={() => navigate('/inspecciones/nuevo')}>Nueva inspección</Button>
          </Can>
        </div>
      </div>

      <div className="shrink-0">
        <ListToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(0)
          }}
          searchPlaceholder="Buscar en notas..."
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
          <InspectionsTable
            rows={inspectionsQuery.data?.rows ?? []}
            loading={inspectionsQuery.isLoading}
            error={inspectionsQuery.isError}
            hasFilters={hasFilters}
            sort={sort}
            onSortChange={setSort}
            onRetry={() => void inspectionsQuery.refetch()}
            onCreate={() => navigate('/inspecciones/nuevo')}
            groupBy={groupBy}
          />
        </TableScrollArea>
        {!groupBy && !inspectionsQuery.isLoading && !inspectionsQuery.isError && (inspectionsQuery.data?.rows.length ?? 0) > 0 && (
          <div className="shrink-0">
            <Pagination page={page} pageSize={20} total={inspectionsQuery.data?.count ?? 0} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
