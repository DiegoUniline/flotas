import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Can } from '@/components/Can'
import { ExpensesTable } from './components/ExpensesTable'
import { useExpensesQuery } from './hooks/useExpenses'
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES, type ExpenseFilters, type ExpenseSort } from './api/expensesApi'
import { computeDateRange } from '@/lib/dateRanges'
import type { AppliedFilter, FilterFieldDef, GroupFieldDef } from '@/lib/queryFilters'

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: 'category', label: 'Categoría', type: 'select', options: EXPENSE_CATEGORIES.map((c) => ({ value: c.value, label: c.label })) },
  { key: 'status', label: 'Estado', type: 'select', options: EXPENSE_STATUSES.map((s) => ({ value: s.value, label: s.label })) },
]

const GROUP_FIELDS: GroupFieldDef[] = [
  { key: 'category', label: 'Categoría' },
  { key: 'status', label: 'Estado' },
  { key: 'vehicle_id', label: 'Vehículo' },
]

export function ExpensesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState(computeDateRange('this_month'))
  const [advanced, setAdvanced] = useState<AppliedFilter[]>([])
  const [groupBy, setGroupBy] = useState<string | null>(null)
  const [sort, setSort] = useState<ExpenseSort>({ column: 'expense_date', direction: 'desc' })
  const [page, setPage] = useState(0)

  const filters: ExpenseFilters = { search, dateRange, advanced, groupBy }
  const expensesQuery = useExpensesQuery(filters, sort, page)
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Gastos</h1>
          <p className="text-sm text-gray-500">Gastos operativos de la flota, con flujo de aprobación.</p>
        </div>
        <Can permission="expenses.create">
          <Button onClick={() => navigate('/gastos/nuevo')}>Nuevo gasto</Button>
        </Can>
      </div>

      <div className="shrink-0">
        <ListToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(0)
          }}
          searchPlaceholder="Buscar por descripción..."
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
          <ExpensesTable
            rows={expensesQuery.data?.rows ?? []}
            loading={expensesQuery.isLoading}
            error={expensesQuery.isError}
            hasFilters={hasFilters}
            sort={sort}
            onSortChange={setSort}
            onRetry={() => void expensesQuery.refetch()}
            onCreate={() => navigate('/gastos/nuevo')}
            groupBy={groupBy}
          />
        </TableScrollArea>
        {!groupBy && !expensesQuery.isLoading && !expensesQuery.isError && (expensesQuery.data?.rows.length ?? 0) > 0 && (
          <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
            <span>
              {page * 20 + 1}–{Math.min((page + 1) * 20, expensesQuery.data?.count ?? 0)} de {expensesQuery.data?.count ?? 0}
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
                disabled={(page + 1) * 20 >= (expensesQuery.data?.count ?? 0)}
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
