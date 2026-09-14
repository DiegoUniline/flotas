import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Tabs } from '@/components/ui/Tabs'
import { Can } from '@/components/Can'
import { MaintenanceRecordsTable } from './components/MaintenanceRecordsTable'
import { MaintenanceDueTable } from './components/MaintenanceDueTable'
import { useMaintenanceRecordsQuery } from './hooks/useMaintenanceRecords'
import { useMaintenanceDue } from './hooks/useMaintenanceDue'
import { MAINTENANCE_RECORD_STATUSES, type MaintenanceRecordFilters, type MaintenanceRecordSort } from './api/maintenanceRecordsApi'
import { computeDateRange } from '@/lib/dateRanges'
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
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState(computeDateRange('all'))
  const [advanced, setAdvanced] = useState<AppliedFilter[]>([])
  const [groupBy, setGroupBy] = useState<string | null>(null)
  const [sort, setSort] = useState<MaintenanceRecordSort>({ column: 'scheduled_date', direction: 'desc' })
  const [page, setPage] = useState(0)

  const filters: MaintenanceRecordFilters = { search, dateRange, advanced, groupBy }
  const recordsQuery = useMaintenanceRecordsQuery(filters, sort, page)
  const dueQuery = useMaintenanceDue()
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  const overdueCount = dueQuery.data?.filter((r) => r.status === 'overdue').length ?? 0

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Mantenimientos</h1>
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

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
            <TableScrollArea>
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
              <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
                <span>
                  {page * 20 + 1}–{Math.min((page + 1) * 20, recordsQuery.data?.count ?? 0)} de {recordsQuery.data?.count ?? 0}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded border border-gray-300 px-2.5 py-1 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={(page + 1) * 20 >= (recordsQuery.data?.count ?? 0)}
                    className="rounded border border-gray-300 px-2.5 py-1 disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'vencimientos' && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
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
