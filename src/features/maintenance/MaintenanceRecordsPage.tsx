import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs } from '@/components/ui/Tabs'
import { Can } from '@/components/Can'
import { MaintenanceRecordsTable } from './components/MaintenanceRecordsTable'
import { MaintenanceDueTable } from './components/MaintenanceDueTable'
import { useMaintenanceRecordsQuery } from './hooks/useMaintenanceRecords'
import { useMaintenanceDue } from './hooks/useMaintenanceDue'
import { MAINTENANCE_RECORD_STATUSES, type MaintenanceRecordFilters, type MaintenanceRecordSort } from './api/maintenanceRecordsApi'
import { computeDateRange } from '@/lib/dateRanges'
import { useListState } from '@/hooks/useListState'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import type { AppliedFilter, FilterFieldDef, GroupFieldDef } from '@/lib/queryFilters'

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: 'status', label: 'Estado', type: 'select', options: MAINTENANCE_RECORD_STATUSES.map((s) => ({ value: s.value, label: s.label })) },
]

const GROUP_FIELDS: GroupFieldDef[] = [
  { key: 'vehicle_id', label: 'Vehículo' },
  { key: 'status', label: 'Estado' },
  { key: 'maintenance_type_id', label: 'Servicio' },
]

export function MaintenanceRecordsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('historial')
  // `useListState` (en vez de `useState`) persiste cada slice en sessionStorage —
  // al volver de un detalle la lista conserva búsqueda/filtros/orden/página.
  const [search, setSearch] = useListState('maintenance-records.search', '')
  const [dateRange, setDateRange] = useListState('maintenance-records.dateRange', () => computeDateRange('all'))
  const [advanced, setAdvanced] = useListState<AppliedFilter[]>('maintenance-records.advanced', [])
  const [groupBy, setGroupBy] = useListState<string | null>('maintenance-records.groupBy', null)
  const [sort, setSort] = useListState<MaintenanceRecordSort>('maintenance-records.sort', { column: 'scheduled_date', direction: 'desc' })
  const [page, setPage] = useListState('maintenance-records.page', 0)
  const scrollRef = useScrollRestoration<HTMLDivElement>('maintenance-records-list')

  const filters: MaintenanceRecordFilters = { search, dateRange, advanced, groupBy }
  const recordsQuery = useMaintenanceRecordsQuery(filters, sort, page)
  const dueQuery = useMaintenanceDue()
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  const overdueCount = dueQuery.data?.filter((r) => r.status === 'overdue').length ?? 0

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Mantenimientos</h1>
          <p className="text-sm text-gray-500">Servicios preventivos y correctivos de la flota, con vencimientos por km y por tiempo.</p>
        </div>
        <div className="flex items-center gap-3">
          <Can permission="maintenance.manage">
            <button
              type="button"
              onClick={() => navigate('/mantenimientos/tipos')}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-ink"
            >
              <Settings2 size={15} strokeWidth={2} />
              Tipos de servicio
            </button>
          </Can>
          <Can permission="maintenance.manage">
            <Button onClick={() => navigate('/mantenimientos/nuevo')}>Nuevo servicio</Button>
          </Can>
        </div>
      </div>

      <div className="shrink-0">
        <Tabs
          items={[
            { key: 'historial', label: 'Historial' },
            { key: 'vencimientos', label: 'Próximos vencimientos', count: overdueCount > 0 ? overdueCount : undefined },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'historial' && (
        <>
          <div className="shrink-0">
            <ListToolbar
              search={search}
              onSearchChange={(v) => {
                setSearch(v)
                setPage(0)
              }}
              searchPlaceholder="Buscar por taller/proveedor..."
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
              <MaintenanceRecordsTable
                rows={recordsQuery.data?.rows ?? []}
                loading={recordsQuery.isLoading}
                error={recordsQuery.isError}
                hasFilters={hasFilters}
                sort={sort}
                onSortChange={setSort}
                onRetry={() => void recordsQuery.refetch()}
                onCreate={() => navigate('/mantenimientos/nuevo')}
                groupBy={groupBy}
              />
            </TableScrollArea>
            {!groupBy && !recordsQuery.isLoading && !recordsQuery.isError && (recordsQuery.data?.rows.length ?? 0) > 0 && (
              <div className="shrink-0">
                <Pagination page={page} pageSize={20} total={recordsQuery.data?.count ?? 0} onPageChange={setPage} />
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'vencimientos' && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-surface">
          <TableScrollArea>
            <MaintenanceDueTable
              rows={dueQuery.data ?? []}
              loading={dueQuery.isLoading}
              error={dueQuery.isError}
              onRetry={() => void dueQuery.refetch()}
            />
          </TableScrollArea>
        </div>
      )}
    </div>
  )
}
