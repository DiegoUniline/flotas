import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Can } from '@/components/Can'
import { InspectionsTable } from './components/InspectionsTable'
import { useInspectionsQuery } from './hooks/useInspections'
import { INSPECTION_RESULTS, type InspectionFilters, type InspectionSort } from './api/inspectionsApi'
import { computeDateRange } from '@/lib/dateRanges'
import type { AppliedFilter, FilterFieldDef, GroupFieldDef } from '@/lib/queryFilters'

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: 'overall_result', label: 'Resultado', type: 'select', options: INSPECTION_RESULTS.map((r) => ({ value: r.value, label: r.label })) },
]

const GROUP_FIELDS: GroupFieldDef[] = [
  { key: 'vehicle_id', label: 'Vehículo' },
  { key: 'overall_result', label: 'Resultado' },
  { key: 'template_id', label: 'Plantilla' },
]

export function InspectionsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState(computeDateRange('this_month'))
  const [advanced, setAdvanced] = useState<AppliedFilter[]>([])
  const [groupBy, setGroupBy] = useState<string | null>(null)
  const [sort, setSort] = useState<InspectionSort>({ column: 'performed_at', direction: 'desc' })
  const [page, setPage] = useState(0)

  const filters: InspectionFilters = { search, dateRange, advanced, groupBy }
  const inspectionsQuery = useInspectionsQuery(filters, sort, page)
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Inspecciones</h1>
          <p className="text-sm text-gray-500">Checklists de inspección aplicados a los vehículos.</p>
        </div>
        <div className="flex items-center gap-3">
          <Can permission="inspections.perform">
            <button
              type="button"
              onClick={() => navigate('/inspecciones/plantillas')}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-ink"
            >
              <ClipboardList size={15} strokeWidth={2} />
              Plantillas
            </button>
          </Can>
          <Can permission="inspections.perform">
            <Button onClick={() => navigate('/inspecciones/nuevo')}>Nueva inspección</Button>
          </Can>
        </div>
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
        <TableScrollArea>
          <InspectionsTable
            rows={inspectionsQuery.data?.rows ?? []}
            loading={inspectionsQuery.isLoading}
            error={inspectionsQuery.isError}
            hasFilters={hasFilters}
            sort={sort}
            onSortChange={setSort}
            onRetry={() => void inspectionsQuery.refetch()}
            onCreate={() => navigate('/inspecciones/nuevo')}
            groupBy={groupBy}
          />
        </TableScrollArea>
        {!groupBy && !inspectionsQuery.isLoading && !inspectionsQuery.isError && (inspectionsQuery.data?.rows.length ?? 0) > 0 && (
          <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
            <span>
              {page * 20 + 1}–{Math.min((page + 1) * 20, inspectionsQuery.data?.count ?? 0)} de {inspectionsQuery.data?.count ?? 0}
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
                disabled={(page + 1) * 20 >= (inspectionsQuery.data?.count ?? 0)}
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
