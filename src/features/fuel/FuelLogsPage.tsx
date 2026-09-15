import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Pagination } from '@/components/ui/Pagination'
import { Can } from '@/components/Can'
import { FuelLogsTable } from './components/FuelLogsTable'
import { useFuelLogsQuery } from './hooks/useFuelLogs'
import type { FuelLogFilters, FuelLogSort } from './api/fuelLogsApi'
import { computeDateRange } from '@/lib/dateRanges'
import { useListState } from '@/hooks/useListState'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import type { AppliedFilter, FilterFieldDef, GroupFieldDef } from '@/lib/queryFilters'

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: 'full_tank', label: 'Tanque lleno', type: 'boolean' },
  { key: 'has_invoice', label: 'Lleva factura', type: 'boolean' },
  { key: 'invoiced', label: 'Ya facturado', type: 'boolean' },
]

const GROUP_FIELDS: GroupFieldDef[] = [
  { key: 'vehicle_id', label: 'Vehículo' },
  { key: 'full_tank', label: 'Tipo de carga' },
  { key: 'fuel_station_id', label: 'Gasolinera' },
  { key: 'fuel_type_id', label: 'Tipo de combustible' },
]

export function FuelLogsPage() {
  const navigate = useNavigate()
  // `useListState` (en vez de `useState`) persiste cada slice en sessionStorage —
  // al volver de un detalle la lista conserva búsqueda/filtros/orden/página.
  const [search, setSearch] = useListState('fuel-logs.search', '')
  const [dateRange, setDateRange] = useListState('fuel-logs.dateRange', () => computeDateRange('this_month'))
  const [advanced, setAdvanced] = useListState<AppliedFilter[]>('fuel-logs.advanced', [])
  const [groupBy, setGroupBy] = useListState<string | null>('fuel-logs.groupBy', null)
  const [sort, setSort] = useListState<FuelLogSort>('fuel-logs.sort', { column: 'logged_at', direction: 'desc' })
  const [page, setPage] = useListState('fuel-logs.page', 0)
  const scrollRef = useScrollRestoration<HTMLDivElement>('fuel-logs-list')

  const filters: FuelLogFilters = { search, dateRange, advanced, groupBy }
  const fuelLogsQuery = useFuelLogsQuery(filters, sort, page)
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Combustible</h1>
          <p className="text-sm text-gray-500">Historial de cargas de combustible de la flota.</p>
        </div>
        <Can permission="fuel.manage">
          <Button onClick={() => navigate('/combustible/nuevo')}>Nueva carga</Button>
        </Can>
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
          <FuelLogsTable
            rows={fuelLogsQuery.data?.rows ?? []}
            loading={fuelLogsQuery.isLoading}
            error={fuelLogsQuery.isError}
            hasFilters={hasFilters}
            sort={sort}
            onSortChange={setSort}
            onRetry={() => void fuelLogsQuery.refetch()}
            onCreate={() => navigate('/combustible/nuevo')}
            groupBy={groupBy}
          />
        </TableScrollArea>
        {!groupBy && !fuelLogsQuery.isLoading && !fuelLogsQuery.isError && (fuelLogsQuery.data?.rows.length ?? 0) > 0 && (
          <div className="shrink-0">
            <Pagination page={page} pageSize={20} total={fuelLogsQuery.data?.count ?? 0} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
