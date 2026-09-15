import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Pagination } from '@/components/ui/Pagination'
import { Can } from '@/components/Can'
import { DevicesTable } from './components/DevicesTable'
import { useDevicesQuery } from './hooks/useDevices'
import { DEVICE_STATUSES, DEVICE_TYPES, type DeviceFilters, type DeviceSort } from './api/devicesApi'
import { computeDateRange } from '@/lib/dateRanges'
import { useListState } from '@/hooks/useListState'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import type { AppliedFilter, FilterFieldDef, GroupFieldDef } from '@/lib/queryFilters'

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: 'device_type', label: 'Tipo', type: 'select', options: DEVICE_TYPES.map((t) => ({ value: t.value, label: t.label })) },
  { key: 'status', label: 'Estado', type: 'select', options: DEVICE_STATUSES.map((s) => ({ value: s.value, label: s.label })) },
  { key: 'active', label: 'Activo', type: 'boolean' },
]

const GROUP_FIELDS: GroupFieldDef[] = [
  { key: 'device_type', label: 'Tipo' },
  { key: 'status', label: 'Estado' },
  { key: 'active', label: 'Activo' },
]

export function DevicesPage() {
  const navigate = useNavigate()
  // `useListState` (en vez de `useState`) persiste cada slice en sessionStorage —
  // al volver de un detalle la lista conserva búsqueda/filtros/orden/página.
  const [search, setSearch] = useListState('devices.search', '')
  const [dateRange, setDateRange] = useListState('devices.dateRange', () => computeDateRange('all'))
  const [advanced, setAdvanced] = useListState<AppliedFilter[]>('devices.advanced', [])
  const [groupBy, setGroupBy] = useListState<string | null>('devices.groupBy', null)
  const [sort, setSort] = useListState<DeviceSort>('devices.sort', { column: 'name', direction: 'asc' })
  const [page, setPage] = useListState('devices.page', 0)
  const scrollRef = useScrollRestoration<HTMLDivElement>('devices-list')

  const filters: DeviceFilters = { search, dateRange, advanced, groupBy }
  const devicesQuery = useDevicesQuery(filters, sort, page)
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Dispositivos</h1>
          <p className="text-sm text-gray-500">Inventario de hardware asignado a la flota (rastreadores, dashcams, sensores, etc.).</p>
        </div>
        <Can permission="devices.manage">
          <Button onClick={() => navigate('/dispositivos/nuevo')}>Nuevo dispositivo</Button>
        </Can>
      </div>

      <div className="shrink-0">
        <ListToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(0)
          }}
          searchPlaceholder="Buscar por nombre o número de serie..."
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
          <DevicesTable
            rows={devicesQuery.data?.rows ?? []}
            loading={devicesQuery.isLoading}
            error={devicesQuery.isError}
            hasFilters={hasFilters}
            sort={sort}
            onSortChange={setSort}
            onRetry={() => void devicesQuery.refetch()}
            onCreate={() => navigate('/dispositivos/nuevo')}
            groupBy={groupBy}
          />
        </TableScrollArea>
        {!groupBy && !devicesQuery.isLoading && !devicesQuery.isError && (devicesQuery.data?.rows.length ?? 0) > 0 && (
          <div className="shrink-0">
            <Pagination page={page} pageSize={20} total={devicesQuery.data?.count ?? 0} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
