import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Can } from '@/components/Can'
import { VehiclesTable } from './components/VehiclesTable'
import { useVehiclesQuery } from './hooks/useVehicles'
import { VEHICLE_STATUSES, type VehicleFilters, type VehicleSort } from './api/vehiclesApi'
import { computeDateRange } from '@/lib/dateRanges'
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
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState(computeDateRange('all'))
  const [advanced, setAdvanced] = useState<AppliedFilter[]>([])
  const [groupBy, setGroupBy] = useState<string | null>(null)
  const [sort, setSort] = useState<VehicleSort>({ column: 'economic_number', direction: 'asc' })
  const [page, setPage] = useState(0)

  const filters: VehicleFilters = { search, dateRange, advanced, groupBy }
  const vehiclesQuery = useVehiclesQuery(filters, sort, page)
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Vehículos</h1>
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
        <TableScrollArea>
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
          <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
            <span>
              {page * 20 + 1}–{Math.min((page + 1) * 20, vehiclesQuery.data?.count ?? 0)} de {vehiclesQuery.data?.count ?? 0}
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
                disabled={(page + 1) * 20 >= (vehiclesQuery.data?.count ?? 0)}
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
