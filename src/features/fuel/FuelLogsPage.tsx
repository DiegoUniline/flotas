import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Can } from '@/components/Can'
import { FuelLogsTable } from './components/FuelLogsTable'
import { useFuelLogsQuery } from './hooks/useFuelLogs'
import type { FuelLogFilters, FuelLogSort } from './api/fuelLogsApi'
import { computeDateRange } from '@/lib/dateRanges'
import type { AppliedFilter, FilterFieldDef, GroupFieldDef } from '@/lib/queryFilters'

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: 'fuel_type', label: 'Combustible', type: 'text' },
  { key: 'full_tank', label: 'Tanque lleno', type: 'boolean' },
  { key: 'station', label: 'Gasolinera', type: 'text' },
]

const GROUP_FIELDS: GroupFieldDef[] = [
  { key: 'vehicle_id', label: 'Vehículo' },
  { key: 'full_tank', label: 'Tipo de carga' },
]

export function FuelLogsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState(computeDateRange('this_month'))
  const [advanced, setAdvanced] = useState<AppliedFilter[]>([])
  const [groupBy, setGroupBy] = useState<string | null>(null)
  const [sort, setSort] = useState<FuelLogSort>({ column: 'logged_at', direction: 'desc' })
  const [page, setPage] = useState(0)

  const filters: FuelLogFilters = { search, dateRange, advanced, groupBy }
  const fuelLogsQuery = useFuelLogsQuery(filters, sort, page)
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Combustible</h1>
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
          searchPlaceholder="Buscar por gasolinera..."
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
          <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
            <span>
              {page * 20 + 1}–{Math.min((page + 1) * 20, fuelLogsQuery.data?.count ?? 0)} de {fuelLogsQuery.data?.count ?? 0}
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
                disabled={(page + 1) * 20 >= (fuelLogsQuery.data?.count ?? 0)}
                className="rounded border border-gray-300 px-2.5 py-1 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
