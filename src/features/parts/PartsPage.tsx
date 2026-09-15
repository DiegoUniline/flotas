import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Pagination } from '@/components/ui/Pagination'
import { Can } from '@/components/Can'
import { PartsTable } from './components/PartsTable'
import { usePartsQuery } from './hooks/useParts'
import type { PartFilters, PartSort } from './api/partsApi'
import { computeDateRange } from '@/lib/dateRanges'
import { useListState } from '@/hooks/useListState'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import type { AppliedFilter, FilterFieldDef, GroupFieldDef } from '@/lib/queryFilters'

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: 'category', label: 'Categoría', type: 'text' },
  { key: 'active', label: 'Activa', type: 'boolean' },
  { key: 'supplier', label: 'Proveedor', type: 'text' },
]

const GROUP_FIELDS: GroupFieldDef[] = [
  { key: 'category', label: 'Categoría' },
  { key: 'active', label: 'Estado' },
]

export function PartsPage() {
  const navigate = useNavigate()
  // `useListState` (en vez de `useState`) persiste cada slice en sessionStorage —
  // al volver de un detalle la lista conserva búsqueda/filtros/orden/página.
  const [search, setSearch] = useListState('parts.search', '')
  const [dateRange, setDateRange] = useListState('parts.dateRange', () => computeDateRange('all'))
  const [advanced, setAdvanced] = useListState<AppliedFilter[]>('parts.advanced', [])
  const [groupBy, setGroupBy] = useListState<string | null>('parts.groupBy', null)
  const [sort, setSort] = useListState<PartSort>('parts.sort', { column: 'name', direction: 'asc' })
  const [page, setPage] = useListState('parts.page', 0)
  const scrollRef = useScrollRestoration<HTMLDivElement>('parts-list')

  const filters: PartFilters = { search, dateRange, advanced, groupBy }
  const partsQuery = usePartsQuery(filters, sort, page)
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Refacciones</h1>
          <p className="text-sm text-gray-500">Inventario de refacciones y su uso en los servicios de mantenimiento.</p>
        </div>
        <Can permission="maintenance.manage">
          <Button onClick={() => navigate('/refacciones/nuevo')}>Nueva refacción</Button>
        </Can>
      </div>

      <div className="shrink-0">
        <ListToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(0)
          }}
          searchPlaceholder="Buscar por nombre o número de parte..."
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
          <PartsTable
            rows={partsQuery.data?.rows ?? []}
            loading={partsQuery.isLoading}
            error={partsQuery.isError}
            hasFilters={hasFilters}
            sort={sort}
            onSortChange={setSort}
            onRetry={() => void partsQuery.refetch()}
            onCreate={() => navigate('/refacciones/nuevo')}
            groupBy={groupBy}
          />
        </TableScrollArea>
        {!groupBy && !partsQuery.isLoading && !partsQuery.isError && (partsQuery.data?.rows.length ?? 0) > 0 && (
          <div className="shrink-0">
            <Pagination page={page} pageSize={20} total={partsQuery.data?.count ?? 0} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
