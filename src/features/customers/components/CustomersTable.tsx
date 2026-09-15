import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { groupRows } from '@/lib/groupRows'
import { RecordList, type RecordListItem } from '@/components/ui/RecordList'
import { CUSTOMER_STATUSES, type Customer, type CustomerSort, type CustomerSortColumn } from '@/features/customers/api/customersApi'

const STATUS_LABELS = Object.fromEntries(CUSTOMER_STATUSES.map((s) => [s.value, s.label]))

interface Column {
  key: CustomerSortColumn
  label: string
}

const COLUMNS: Column[] = [
  { key: 'code', label: 'Código' },
  { key: 'name', label: 'Nombre' },
]

function groupLabel(row: Customer, groupBy: string): string {
  switch (groupBy) {
    case 'status':
      return STATUS_LABELS[row.status] ?? row.status
    default:
      return '—'
  }
}

interface CustomersTableProps {
  rows: Customer[]
  loading: boolean
  error: boolean
  hasFilters: boolean
  sort: CustomerSort
  onSortChange: (sort: CustomerSort) => void
  onRetry: () => void
  onCreate: () => void
  groupBy: string | null
}

export function CustomersTable({ rows, loading, error, hasFilters, sort, onSortChange, onRetry, onCreate, groupBy }: CustomersTableProps) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (error) {
    return <ErrorState message="No se pudieron cargar los clientes." onRetry={onRetry} />
  }

  if (loading) {
    return <TableSkeleton columns={4} />
  }

  if (rows.length === 0) {
    return hasFilters ? (
      <EmptyState title="Sin resultados" description="Ajusta la búsqueda o los filtros." />
    ) : (
      <EmptyState
        title="Aún no hay clientes"
        description="Registra el primer cliente de tu organización."
        action={
          <Can permission="jobs.manage">
            <button
              type="button"
              onClick={onCreate}
              className="rounded-md bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600"
            >
              Nuevo cliente
            </button>
          </Can>
        }
      />
    )
  }

  function toggleSort(column: CustomerSortColumn) {
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

  function CustomerRow({ customer }: { customer: Customer }) {
    return (
      <tr onClick={() => navigate(`/clientes/${customer.id}`)} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-2 text-gray-700">{customer.code ?? '—'}</td>
        <td className="px-4 py-2 font-medium text-gray-900">{customer.name}</td>
        <td className="px-4 py-2 text-gray-700">{customer.phone ?? '—'}</td>
        <td className="px-4 py-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              customer.status === 'active' ? 'bg-status-active-bg text-status-active' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {STATUS_LABELS[customer.status] ?? customer.status}
          </span>
        </td>
      </tr>
    )
  }

  function toRecord(customer: Customer): RecordListItem {
    return {
      id: customer.id,
      onClick: () => navigate(`/clientes/${customer.id}`),
      title: customer.name,
      subtitle: customer.code ?? undefined,
      status: {
        label: STATUS_LABELS[customer.status] ?? customer.status,
        tone: customer.status === 'active' ? 'bg-status-active-bg text-status-active' : 'bg-gray-100 text-gray-500',
      },
      fields: [{ label: 'Teléfono', value: customer.phone ?? '—' }],
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
      <th className="px-4 py-2">Teléfono</th>
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
                <td colSpan={4} className="px-4 py-1.5">
                  <button type="button" onClick={() => toggleGroup(group.key)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                    {collapsed.has(group.key) ? <ChevronRight size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
                    {group.label}
                    <span className="font-normal text-gray-400">({group.rows.length})</span>
                  </button>
                </td>
              </tr>
              {!collapsed.has(group.key) && group.rows.map((customer) => <CustomerRow key={customer.id} customer={customer} />)}
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
        {rows.map((customer) => (
          <CustomerRow key={customer.id} customer={customer} />
        ))}
          </tbody>
        </table>
      </div>
      <RecordList items={rows.map(toRecord)} className="sm:hidden" />
    </>
  )
}
