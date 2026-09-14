import { Link } from 'react-router-dom'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
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

interface CustomersTableProps {
  rows: Customer[]
  loading: boolean
  error: boolean
  hasFilters: boolean
  sort: CustomerSort
  onSortChange: (sort: CustomerSort) => void
  onRetry: () => void
  onCreate: () => void
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

export function CustomersTable({
  rows,
  loading,
  error,
  hasFilters,
  sort,
  onSortChange,
  onRetry,
  onCreate,
  onEdit,
  onDelete,
}: CustomersTableProps) {
  if (error) {
    return <ErrorState message="No se pudieron cargar los clientes." onRetry={onRetry} />
  }

  if (loading) {
    return <TableSkeleton columns={5} />
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

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
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
          <th className="px-4 py-2" />
        </tr>
      </thead>
      <tbody>
        {rows.map((customer) => (
          <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-4 py-2 text-gray-700">{customer.code ?? '—'}</td>
            <td className="px-4 py-2 font-medium text-gray-900">
              <Link to={`/clientes/${customer.id}`} className="hover:text-accent-600">
                {customer.name}
              </Link>
            </td>
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
            <td className="px-4 py-2 text-right">
              <Can permission="jobs.manage">
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => onEdit(customer)} className="text-sm font-medium text-gray-600 hover:text-gray-900">
                    Editar
                  </button>
                  <button type="button" onClick={() => onDelete(customer)} className="text-sm font-medium text-red-600 hover:text-red-700">
                    Eliminar
                  </button>
                </div>
              </Can>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
