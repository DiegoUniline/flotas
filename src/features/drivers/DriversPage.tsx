import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Can } from '@/components/Can'
import { DriversTable } from './components/DriversTable'
import { useDriversQuery } from './hooks/useDrivers'
import { DRIVER_STATUSES, type DriverFilters, type DriverSort } from './api/driversApi'
import { computeDateRange } from '@/lib/dateRanges'
import type { AppliedFilter, FilterFieldDef, GroupFieldDef } from '@/lib/queryFilters'

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: 'status', label: 'Estado', type: 'select', options: DRIVER_STATUSES.map((s) => ({ value: s.value, label: s.label })) },
  { key: 'active', label: 'Activo', type: 'boolean' },
  { key: 'employee_number', label: 'No. empleado', type: 'text' },
]

const GROUP_FIELDS: GroupFieldDef[] = [
  { key: 'status', label: 'Estado' },
  { key: 'active', label: 'Activo' },
]

export function DriversPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState(computeDateRange('all'))
  const [advanced, setAdvanced] = useState<AppliedFilter[]>([])
  const [groupBy, setGroupBy] = useState<string | null>(null)
  const [sort, setSort] = useState<DriverSort>({ column: 'first_name', direction: 'asc' })
  const [page, setPage] = useState(0)

  const filters: DriverFilters = { search, dateRange, advanced, groupBy }
  const driversQuery = useDriversQuery(filters, sort, page)
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Operadores</h1>
          <p className="text-sm text-gray-500">Conductores registrados en tu organización.</p>
        </div>
        <Can permission="drivers.create">
          <Button onClick={() => navigate('/operadores/nuevo')}>Nuevo operador</Button>
        </Can>
      </div>

      <div className="shrink-0">
        <ListToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(0)
          }}
          searchPlaceholder="Buscar por nombre, empleado o teléfono..."
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
        <TableScrollArea>
          <DriversTable
            rows={driversQuery.data?.rows ?? []}
            loading={driversQuery.isLoading}
            error={driversQuery.isError}
            hasFilters={hasFilters}
            sort={sort}
            onSortChange={setSort}
            onRetry={() => void driversQuery.refetch()}
            onCreate={() => navigate('/operadores/nuevo')}
            groupBy={groupBy}
          />
        </TableScrollArea>
        {!groupBy && !driversQuery.isLoading && !driversQuery.isError && (driversQuery.data?.rows.length ?? 0) > 0 && (
          <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
            <span>
              {page * 20 + 1}–{Math.min((page + 1) * 20, driversQuery.data?.count ?? 0)} de {driversQuery.data?.count ?? 0}
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
                disabled={(page + 1) * 20 >= (driversQuery.data?.count ?? 0)}
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
