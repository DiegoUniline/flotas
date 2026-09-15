import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ListToolbar } from '@/components/ui/ListToolbar'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Pagination } from '@/components/ui/Pagination'
import { Can } from '@/components/Can'
import { CustomersTable } from './components/CustomersTable'
import { useCustomersQuery } from './hooks/useCustomers'
import { CUSTOMER_STATUSES, type CustomerFilters, type CustomerSort } from './api/customersApi'
import { computeDateRange } from '@/lib/dateRanges'
import { useListState } from '@/hooks/useListState'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import type { AppliedFilter, FilterFieldDef, GroupFieldDef } from '@/lib/queryFilters'

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: 'status', label: 'Estado', type: 'select', options: CUSTOMER_STATUSES.map((s) => ({ value: s.value, label: s.label })) },
  { key: 'tax_id', label: 'RFC', type: 'text' },
]

const GROUP_FIELDS: GroupFieldDef[] = [{ key: 'status', label: 'Estado' }]

export function CustomersPage() {
  const navigate = useNavigate()
  // `useListState` (en vez de `useState`) persiste cada slice en sessionStorage —
  // al volver de un detalle la lista conserva búsqueda/filtros/orden/página.
  const [search, setSearch] = useListState('customers.search', '')
  const [dateRange, setDateRange] = useListState('customers.dateRange', () => computeDateRange('all'))
  const [advanced, setAdvanced] = useListState<AppliedFilter[]>('customers.advanced', [])
  const [groupBy, setGroupBy] = useListState<string | null>('customers.groupBy', null)
  const [sort, setSort] = useListState<CustomerSort>('customers.sort', { column: 'name', direction: 'asc' })
  const [page, setPage] = useListState('customers.page', 0)
  const scrollRef = useScrollRestoration<HTMLDivElement>('customers-list')

  const filters: CustomerFilters = { search, dateRange, advanced, groupBy }
  const customersQuery = useCustomersQuery(filters, sort, page)
  const hasFilters = search.trim() !== '' || advanced.length > 0 || dateRange.preset !== 'all'

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Clientes</h1>
          <p className="text-sm text-gray-500">Clientes y domicilios de entrega.</p>
        </div>
        <Can permission="jobs.manage">
          <Button onClick={() => navigate('/clientes/nuevo')}>Nuevo cliente</Button>
        </Can>
      </div>

      <div className="shrink-0">
        <ListToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(0)
          }}
          searchPlaceholder="Buscar por nombre, código o teléfono..."
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
          <CustomersTable
            rows={customersQuery.data?.rows ?? []}
            loading={customersQuery.isLoading}
            error={customersQuery.isError}
            hasFilters={hasFilters}
            sort={sort}
            onSortChange={setSort}
            onRetry={() => void customersQuery.refetch()}
            onCreate={() => navigate('/clientes/nuevo')}
            groupBy={groupBy}
          />
        </TableScrollArea>
        {!groupBy && !customersQuery.isLoading && !customersQuery.isError && (customersQuery.data?.rows.length ?? 0) > 0 && (
          <div className="shrink-0">
            <Pagination page={page} pageSize={20} total={customersQuery.data?.count ?? 0} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
