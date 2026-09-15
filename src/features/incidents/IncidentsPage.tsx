import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Can } from '@/components/Can'
import { IncidentsTable } from './components/IncidentsTable'
import { useIncidentsQuery } from './hooks/useIncidents'
import {
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  type IncidentFilters,
  type IncidentSort,
} from './api/incidentsApi'
import { computeDateRange } from '@/lib/dateRanges'
import type { AppliedFilter, FilterFieldDef, GroupFieldDef } from '@/lib/queryFilters'

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: 'incident_type', label: 'Tipo', type: 'select', options: INCIDENT_TYPES.map((t) => ({ value: t.value, label: t.label })) },
  { key: 'severity', label: 'Severidad', type: 'select', options: INCIDENT_SEVERITIES.map((s) => ({ value: s.value, label: s.label })) },
  { key: 'status', label: 'Estado', type: 'select', options: INCIDENT_STATUSES.map((s) => ({ value: s.value, label: s.label })) },
]

const GROUP_FIELDS: GroupFieldDef[] = [
  { key: 'incident_type', label: 'Tipo' },
  { key: 'severity', label: 'Severidad' },
  { key: 'status', label: 'Estado' },
]

export function IncidentsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState(computeDateRange('all'))
  const [advanced, setAdvanced] = useState<AppliedFilter[]>([])
  const [groupBy, setGroupBy] = useState<string | null>(null)
  const [sort, setSort] = useState<IncidentSort>({ column: 'incident_date', direction: 'desc' })
  const [page, setPage] = useState(0)

  const filters: IncidentFilters = { search, dateRange, advanced, groupBy }
  const incidentsQuery = useIncidentsQuery(filters, sort, page)
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Incidentes</h1>
          <p className="text-sm text-gray-500">Accidentes, descomposturas, infracciones y robos registrados en la flota.</p>
        </div>
        <Can permission="alerts.manage">
          <Button onClick={() => navigate('/incidentes/nuevo')}>Nuevo incidente</Button>
        </Can>
      </div>

      <div className="shrink-0">
        <ListToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(0)
          }}
          searchPlaceholder="Buscar por descripción o ubicación..."
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
          <IncidentsTable
            rows={incidentsQuery.data?.rows ?? []}
            loading={incidentsQuery.isLoading}
            error={incidentsQuery.isError}
            hasFilters={hasFilters}
            sort={sort}
            onSortChange={setSort}
            onRetry={() => void incidentsQuery.refetch()}
            onCreate={() => navigate('/incidentes/nuevo')}
            groupBy={groupBy}
          />
        </TableScrollArea>
        {!groupBy && !incidentsQuery.isLoading && !incidentsQuery.isError && (incidentsQuery.data?.rows.length ?? 0) > 0 && (
          <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
            <span>
              {page * 20 + 1}–{Math.min((page + 1) * 20, incidentsQuery.data?.count ?? 0)} de {incidentsQuery.data?.count ?? 0}
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
                disabled={(page + 1) * 20 >= (incidentsQuery.data?.count ?? 0)}
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
