import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Can } from '@/components/Can'
import { PartsTable } from './components/PartsTable'
import { usePartsQuery } from './hooks/useParts'
import type { PartFilters, PartSort } from './api/partsApi'
import { computeDateRange } from '@/lib/dateRanges'
import type { AppliedFilter, FilterFieldDef, GroupFieldDef } from '@/lib/queryFilters'

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: 'category', label: 'Categoría', type: 'text' },
  { key: 'active', label: 'Activa', type: 'boolean' },
  { key: 'supplier', label: 'Proveedor', type: 'text' },
]

const GROUP_FIELDS: GroupFieldDef[] = [
  { key: 'category', label: 'Categoría' },
  { key: 'active', label: 'Estado' },
]

export function PartsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState(computeDateRange('all'))
  const [advanced, setAdvanced] = useState<AppliedFilter[]>([])
  const [groupBy, setGroupBy] = useState<string | null>(null)
  const [sort, setSort] = useState<PartSort>({ column: 'name', direction: 'asc' })
  const [page, setPage] = useState(0)

  const filters: PartFilters = { search, dateRange, advanced, groupBy }
  const partsQuery = usePartsQuery(filters, sort, page)
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Refacciones</h1>
          <p className="text-sm text-gray-500">Inventario de refacciones y su uso en los servicios de mantenimiento.</p>
        </div>
        <Can permission="maintenance.manage">
          <Button onClick={() => navigate('/refacciones/nuevo')}>Nueva refacción</Button>
        </Can>
      </div>

      <div className="shrink-0">
        <ListToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(0)
          }}
          searchPlaceholder="Buscar por nombre o número de parte..."
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
          <PartsTable
            rows={partsQuery.data?.rows ?? []}
            loading={partsQuery.isLoading}
            error={partsQuery.isError}
            hasFilters={hasFilters}
            sort={sort}
            onSortChange={setSort}
            onRetry={() => void partsQuery.refetch()}
            onCreate={() => navigate('/refacciones/nuevo')}
            groupBy={groupBy}
          />
        </TableScrollArea>
        {!groupBy && !partsQuery.isLoading && !partsQuery.isError && (partsQuery.data?.rows.length ?? 0) > 0 && (
          <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
            <span>
              {page * 20 + 1}–{Math.min((page + 1) * 20, partsQuery.data?.count ?? 0)} de {partsQuery.data?.count ?? 0}
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
                disabled={(page + 1) * 20 >= (partsQuery.data?.count ?? 0)}
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
