import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Pagination } from '@/components/ui/Pagination'
import { Can } from '@/components/Can'
import { LocationsTable } from './components/LocationsTable'
import { useLocationsQuery } from './hooks/useLocations'
import { LOCATION_TYPES, type LocationFilters, type LocationSort } from './api/locationsApi'
import { computeDateRange } from '@/lib/dateRanges'
import { useListState } from '@/hooks/useListState'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import type { AppliedFilter, FilterFieldDef, GroupFieldDef } from '@/lib/queryFilters'

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: 'location_type', label: 'Tipo', type: 'select', options: LOCATION_TYPES.map((t) => ({ value: t.value, label: t.label })) },
  { key: 'active', label: 'Activa', type: 'boolean' },
  { key: 'city', label: 'Ciudad', type: 'text' },
  { key: 'state', label: 'Estado', type: 'text' },
]

const GROUP_FIELDS: GroupFieldDef[] = [
  { key: 'location_type', label: 'Tipo' },
  { key: 'active', label: 'Estado' },
  { key: 'state', label: 'Estado (geográfico)' },
]

export function LocationsPage() {
  const navigate = useNavigate()
  // `useListState` (en vez de `useState`) persiste cada slice en sessionStorage —
  // al volver de un detalle la lista conserva búsqueda/filtros/orden/página.
  const [search, setSearch] = useListState('locations.search', '')
  const [dateRange, setDateRange] = useListState('locations.dateRange', () => computeDateRange('all'))
  const [advanced, setAdvanced] = useListState<AppliedFilter[]>('locations.advanced', [])
  const [groupBy, setGroupBy] = useListState<string | null>('locations.groupBy', null)
  const [sort, setSort] = useListState<LocationSort>('locations.sort', { column: 'name', direction: 'asc' })
  const [page, setPage] = useListState('locations.page', 0)
  const scrollRef = useScrollRestoration<HTMLDivElement>('locations-list')

  const filters: LocationFilters = { search, dateRange, advanced, groupBy }
  const locationsQuery = useLocationsQuery(filters, sort, page)
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Sucursales</h1>
          <p className="text-sm text-gray-500">Ubicaciones operativas de tu organización.</p>
        </div>
        <Can permission="locations.manage">
          <Button onClick={() => navigate('/sucursales/nuevo')}>Nueva sucursal</Button>
        </Can>
      </div>

      <div className="shrink-0">
        <ListToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(0)
          }}
          searchPlaceholder="Buscar por nombre o código..."
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
          <LocationsTable
            rows={locationsQuery.data?.rows ?? []}
            loading={locationsQuery.isLoading}
            error={locationsQuery.isError}
            hasFilters={hasFilters}
            sort={sort}
            onSortChange={setSort}
            onRetry={() => void locationsQuery.refetch()}
            onCreate={() => navigate('/sucursales/nuevo')}
            groupBy={groupBy}
          />
        </TableScrollArea>
        {!groupBy && !locationsQuery.isLoading && !locationsQuery.isError && (locationsQuery.data?.rows.length ?? 0) > 0 && (
          <div className="shrink-0">
            <Pagination page={page} pageSize={20} total={locationsQuery.data?.count ?? 0} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
