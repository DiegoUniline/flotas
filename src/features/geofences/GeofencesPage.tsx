import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Pagination } from '@/components/ui/Pagination'
import { Can } from '@/components/Can'
import { GeofencesTable } from './components/GeofencesTable'
import { useGeofencesQuery } from './hooks/useGeofences'
import type { GeofenceFilters, GeofenceSort } from './api/geofencesApi'
import { computeDateRange } from '@/lib/dateRanges'
import { useListState } from '@/hooks/useListState'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import type { AppliedFilter, FilterFieldDef, GroupFieldDef } from '@/lib/queryFilters'

const FILTER_FIELDS: FilterFieldDef[] = [{ key: 'active', label: 'Activa', type: 'boolean' }]

const GROUP_FIELDS: GroupFieldDef[] = [
  { key: 'active', label: 'Estado' },
  { key: 'location_id', label: 'Sucursal' },
]

export function GeofencesPage() {
  const navigate = useNavigate()
  // `useListState` (en vez de `useState`) persiste cada slice en sessionStorage —
  // al volver de un detalle la lista conserva búsqueda/filtros/orden/página.
  const [search, setSearch] = useListState('geofences.search', '')
  const [dateRange, setDateRange] = useListState('geofences.dateRange', () => computeDateRange('all'))
  const [advanced, setAdvanced] = useListState<AppliedFilter[]>('geofences.advanced', [])
  const [groupBy, setGroupBy] = useListState<string | null>('geofences.groupBy', null)
  const [sort, setSort] = useListState<GeofenceSort>('geofences.sort', { column: 'name', direction: 'asc' })
  const [page, setPage] = useListState('geofences.page', 0)
  const scrollRef = useScrollRestoration<HTMLDivElement>('geofences-list')

  const filters: GeofenceFilters = { search, dateRange, advanced, groupBy }
  const geofencesQuery = useGeofencesQuery(filters, sort, page)
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Geocercas</h1>
          <p className="text-sm text-gray-500">Zonas circulares para referencia operativa (entrega, restricción, etc.).</p>
        </div>
        <Can permission="geofences.manage">
          <Button onClick={() => navigate('/geocercas/nuevo')}>Nueva geocerca</Button>
        </Can>
      </div>

      <div className="shrink-0">
        <ListToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(0)
          }}
          searchPlaceholder="Buscar por nombre..."
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
          <GeofencesTable
            rows={geofencesQuery.data?.rows ?? []}
            loading={geofencesQuery.isLoading}
            error={geofencesQuery.isError}
            hasFilters={hasFilters}
            sort={sort}
            onSortChange={setSort}
            onRetry={() => void geofencesQuery.refetch()}
            onCreate={() => navigate('/geocercas/nuevo')}
            groupBy={groupBy}
          />
        </TableScrollArea>
        {!groupBy && !geofencesQuery.isLoading && !geofencesQuery.isError && (geofencesQuery.data?.rows.length ?? 0) > 0 && (
          <div className="shrink-0">
            <Pagination page={page} pageSize={20} total={geofencesQuery.data?.count ?? 0} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
