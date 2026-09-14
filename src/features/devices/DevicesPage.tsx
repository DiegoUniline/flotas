import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Can } from '@/components/Can'
import { DevicesTable } from './components/DevicesTable'
import { useDevicesQuery } from './hooks/useDevices'
import { DEVICE_STATUSES, DEVICE_TYPES, type DeviceFilters, type DeviceSort } from './api/devicesApi'
import { computeDateRange } from '@/lib/dateRanges'
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
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState(computeDateRange('all'))
  const [advanced, setAdvanced] = useState<AppliedFilter[]>([])
  const [groupBy, setGroupBy] = useState<string | null>(null)
  const [sort, setSort] = useState<DeviceSort>({ column: 'name', direction: 'asc' })
  const [page, setPage] = useState(0)

  const filters: DeviceFilters = { search, dateRange, advanced, groupBy }
  const devicesQuery = useDevicesQuery(filters, sort, page)
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Dispositivos</h1>
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
        <TableScrollArea>
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
          <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
            <span>
              {page * 20 + 1}–{Math.min((page + 1) * 20, devicesQuery.data?.count ?? 0)} de {devicesQuery.data?.count ?? 0}
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
                disabled={(page + 1) * 20 >= (devicesQuery.data?.count ?? 0)}
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
