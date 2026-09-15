import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { groupRows } from '@/lib/groupRows'
import { RecordList, type RecordListItem } from '@/components/ui/RecordList'
import { formatCurrency, formatDate } from '@/lib/format'
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES, type ExpenseSort, type ExpenseSortColumn, type ExpenseWithRelations } from '@/features/expenses/api/expensesApi'

interface Column {
  key: ExpenseSortColumn
  label: string
}

const COLUMNS: Column[] = [
  { key: 'expense_date', label: 'Fecha' },
  { key: 'amount', label: 'Monto' },
]

const CATEGORY_LABEL = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.value, c.label]))
const STATUS_LABEL = Object.fromEntries(EXPENSE_STATUSES.map((s) => [s.value, s.label]))
const STATUS_TONE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-500',
  approved: 'bg-status-active-bg text-status-active',
  rejected: 'bg-red-50 text-red-600',
}

function vehicleLabel(vehicle: { economic_number: string; plate: string | null } | null): string {
  if (!vehicle) return '—'
  return vehicle.plate ? `${vehicle.economic_number} · ${vehicle.plate}` : vehicle.economic_number
}

function groupLabel(row: ExpenseWithRelations, groupBy: string): string {
  switch (groupBy) {
    case 'category':
      return CATEGORY_LABEL[row.category] ?? row.category
    case 'status':
      return STATUS_LABEL[row.status] ?? row.status
    case 'vehicle_id':
      return vehicleLabel(row.vehicles)
    default:
      return '—'
  }
}

interface ExpensesTableProps {
  rows: ExpenseWithRelations[]
  loading: boolean
  error: boolean
  hasFilters: boolean
  sort: ExpenseSort
  onSortChange: (sort: ExpenseSort) => void
  onRetry: () => void
  onCreate: () => void
  groupBy: string | null
}

export function ExpensesTable({ rows, loading, error, hasFilters, sort, onSortChange, onRetry, onCreate, groupBy }: ExpensesTableProps) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (error) {
    return <ErrorState message="No se pudieron cargar los gastos." onRetry={onRetry} />
  }

  if (loading) {
    return <TableSkeleton columns={5} />
  }

  if (rows.length === 0) {
    return hasFilters ? (
      <EmptyState title="Sin resultados" description="Ajusta la búsqueda o los filtros." />
    ) : (
      <EmptyState
        title="Aún no hay gastos"
        description="Registra el primer gasto de la operación (casetas, multas, mantenimiento, etc.)."
        action={
          <Can permission="expenses.create">
            <button
              type="button"
              onClick={onCreate}
              className="rounded-md bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600"
            >
              Nuevo gasto
            </button>
          </Can>
        }
      />
    )
  }

  function toggleSort(column: ExpenseSortColumn) {
    if (sort.column === column) {
      onSortChange({ column, direction: sort.direction === 'asc' ? 'desc' : 'asc' })
    } else {
      onSortChange({ column, direction: 'asc' })
    }
  }

  function toggleGroup(key: string) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function ExpenseRow({ expense }: { expense: ExpenseWithRelations }) {
    return (
      <tr onClick={() => navigate(`/gastos/${expense.id}`)} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-2 font-medium text-gray-900">{formatDate(expense.expense_date)}</td>
        <td className="px-4 py-2 text-gray-700">{formatCurrency(expense.amount)}</td>
        <td className="px-4 py-2 text-gray-700">{CATEGORY_LABEL[expense.category] ?? expense.category}</td>
        <td className="px-4 py-2 text-gray-700">{vehicleLabel(expense.vehicles)}</td>
        <td className="px-4 py-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[expense.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {STATUS_LABEL[expense.status] ?? expense.status}
          </span>
        </td>
      </tr>
    )
  }

  function toRecord(expense: ExpenseWithRelations): RecordListItem {
    return {
      id: expense.id,
      onClick: () => navigate(`/gastos/${expense.id}`),
      title: formatCurrency(expense.amount),
      subtitle: formatDate(expense.expense_date),
      status: { label: STATUS_LABEL[expense.status] ?? expense.status, tone: STATUS_TONE[expense.status] ?? 'bg-gray-100 text-gray-500' },
      fields: [
        { label: 'Categoría', value: CATEGORY_LABEL[expense.category] ?? expense.category },
        { label: 'Vehículo', value: vehicleLabel(expense.vehicles) },
      ],
    }
  }

  const headerRow = (
    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
      {COLUMNS.map((column) => (
        <th key={column.key} className="px-4 py-2">
          <button type="button" onClick={() => toggleSort(column.key)} className="flex items-center gap-1 hover:text-gray-900">
            {column.label}
            {sort.column === column.key && (sort.direction === 'asc' ? '↑' : '↓')}
          </button>
        </th>
      ))}
      <th className="px-4 py-2">Categoría</th>
      <th className="px-4 py-2">Vehículo</th>
      <th className="px-4 py-2">Estado</th>
    </tr>
  )

  if (groupBy) {
    const groups = groupRows(
      rows,
      (r) => groupLabel(r, groupBy),
      (r) => groupLabel(r, groupBy),
    )
    return (
      <>
        <div className="hidden sm:block">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10">{headerRow}</thead>
            <tbody>
          {groups.map((group) => (
            <Fragment key={group.key}>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <td colSpan={5} className="px-4 py-1.5">
                  <button type="button" onClick={() => toggleGroup(group.key)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                    {collapsed.has(group.key) ? <ChevronRight size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
                    {group.label}
                    <span className="font-normal text-gray-400">({group.rows.length})</span>
                  </button>
                </td>
              </tr>
              {!collapsed.has(group.key) && group.rows.map((expense) => <ExpenseRow key={expense.id} expense={expense} />)}
            </Fragment>
          ))}
            </tbody>
          </table>
        </div>
        <RecordList
          groups={groups.map((g) => ({ key: g.key, label: g.label, items: g.rows.map(toRecord) }))}
          className="sm:hidden"
        />
      </>
    )
  }

  return (
    <>
      <div className="hidden sm:block">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">{headerRow}</thead>
          <tbody>
        {rows.map((expense) => (
          <ExpenseRow key={expense.id} expense={expense} />
        ))}
          </tbody>
        </table>
      </div>
      <RecordList items={rows.map(toRecord)} className="sm:hidden" />
    </>
  )
}
