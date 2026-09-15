import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { Pagination } from '@/components/ui/Pagination'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Can } from '@/components/Can'
import { VehiclesTable } from './components/VehiclesTable'
import { useVehiclesQuery } from './hooks/useVehicles'
import { VEHICLE_STATUSES, type VehicleFilters, type VehicleSort } from './api/vehiclesApi'
import { computeDateRange } from '@/lib/dateRanges'
import { useListState } from '@/hooks/useListState'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import type { AppliedFilter, FilterFieldDef, GroupFieldDef } from '@/lib/queryFilters'

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: 'status', label: 'Estado', type: 'select', options: VEHICLE_STATUSES.map((s) => ({ value: s.value, label: s.label })) },
  { key: 'active', label: 'Activo', type: 'boolean' },
  { key: 'brand', label: 'Marca', type: 'text' },
  { key: 'fuel_type', label: 'Combustible', type: 'text' },
]

const GROUP_FIELDS: GroupFieldDef[] = [
  { key: 'status', label: 'Estado' },
  { key: 'vehicle_type_id', label: 'Tipo' },
  { key: 'vehicle_group_id', label: 'Grupo' },
  { key: 'location_id', label: 'Sucursal' },
]

export function VehiclesPage() {
  const navigate = useNavigate()
  // `useListState` (en vez de `useState`) persiste cada slice en
  // sessionStorage — al volver de la ficha de un vehículo, la lista
  // conserva búsqueda/filtros/orden/página en vez de reiniciarse.
  const [search, setSearch] = useListState('vehicles.search', '')
  const [dateRange, setDateRange] = useListState('vehicles.dateRange', () => computeDateRange('all'))
  const [advanced, setAdvanced] = useListState<AppliedFilter[]>('vehicles.advanced', [])
  const [groupBy, setGroupBy] = useListState<string | null>('vehicles.groupBy', null)
  const [sort, setSort] = useListState<VehicleSort>('vehicles.sort', { column: 'economic_number', direction: 'asc' })
  const [page, setPage] = useListState('vehicles.page', 0)
  const scrollRef = useScrollRestoration<HTMLDivElement>('vehicles-list')

  const filters: VehicleFilters = { search, dateRange, advanced, groupBy }
  const vehiclesQuery = useVehiclesQuery(filters, sort, page)
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Vehículos</h1>
          <p className="text-sm text-gray-500">Flota registrada de tu organización.</p>
        </div>
        <Can permission="vehicles.create">
          <Button onClick={() => navigate('/vehiculos/nuevo')}>Nuevo vehículo</Button>
        </Can>
      </div>

      <div className="shrink-0">
        <ListToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(0)
          }}
          searchPlaceholder="Buscar por número, placa o marca..."
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
          <VehiclesTable
            rows={vehiclesQuery.data?.rows ?? []}
            loading={vehiclesQuery.isLoading}
            error={vehiclesQuery.isError}
            hasFilters={hasFilters}
            sort={sort}
            onSortChange={setSort}
            onRetry={() => void vehiclesQuery.refetch()}
            onCreate={() => navigate('/vehiculos/nuevo')}
            groupBy={groupBy}
          />
        </TableScrollArea>
        {!groupBy && !vehiclesQuery.isLoading && !vehiclesQuery.isError && (vehiclesQuery.data?.rows.length ?? 0) > 0 && (
          <div className="shrink-0">
            <Pagination page={page} pageSize={20} total={vehiclesQuery.data?.count ?? 0} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
