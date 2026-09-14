import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Pagination } from '@/components/ui/Pagination'
import { Can } from '@/components/Can'
import { CustomersTable } from './components/CustomersTable'
import { CustomerForm, toCustomerInsert, type CustomerFormValues } from './components/CustomerForm'
import { useCreateCustomer, useCustomersQuery, useDeleteCustomer, useUpdateCustomer, PAGE_SIZE } from './hooks/useCustomers'
import { CUSTOMER_STATUSES, type Customer, type CustomerFilters, type CustomerSort } from './api/customersApi'

type DrawerState = { mode: 'create' } | { mode: 'edit'; customer: Customer } | null

export function CustomersPage() {
  const [filters, setFilters] = useState<CustomerFilters>({ search: '', status: null })
  const [sort, setSort] = useState<CustomerSort>({ column: 'name', direction: 'asc' })
  const [page, setPage] = useState(0)
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  const customersQuery = useCustomersQuery(filters, sort, page)
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()
  const deleteMutation = useDeleteCustomer()

  const hasFilters = filters.search.trim() !== '' || filters.status !== null

  function updateFilters(patch: Partial<CustomerFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
    setPage(0)
  }

  function handleFormSubmit(values: CustomerFormValues) {
    const input = toCustomerInsert(values)
    if (drawer?.mode === 'edit') {
      updateMutation.mutate({ id: drawer.customer.id, input }, { onSuccess: () => setDrawer(null) })
    } else {
      createMutation.mutate(input, { onSuccess: () => setDrawer(null) })
    }
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Clientes</h1>
          <p className="text-sm text-gray-500">Clientes y domicilios de entrega.</p>
        </div>
        <Can permission="jobs.manage">
          <Button onClick={() => setDrawer({ mode: 'create' })}>Nuevo cliente</Button>
        </Can>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar por nombre, código o teléfono"
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="max-w-xs"
        />
        <select
          value={filters.status ?? ''}
          onChange={(e) => updateFilters({ status: e.target.value || null })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        >
          <option value="">Todos los estados</option>
          {CUSTOMER_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <CustomersTable
          rows={customersQuery.data?.rows ?? []}
          loading={customersQuery.isLoading}
          error={customersQuery.isError}
          hasFilters={hasFilters}
          sort={sort}
          onSortChange={(next) => {
            setSort(next)
            setPage(0)
          }}
          onRetry={() => void customersQuery.refetch()}
          onCreate={() => setDrawer({ mode: 'create' })}
          onEdit={(customer) => setDrawer({ mode: 'edit', customer })}
          onDelete={(customer) => setDeleteTarget(customer)}
        />
        {!customersQuery.isLoading && !customersQuery.isError && (customersQuery.data?.rows.length ?? 0) > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={customersQuery.data?.count ?? 0} onPageChange={setPage} />
        )}
      </div>

      <Drawer open={drawer !== null} title={drawer?.mode === 'edit' ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => setDrawer(null)}>
        <CustomerForm
          customer={drawer?.mode === 'edit' ? drawer.customer : undefined}
          submitLabel={drawer?.mode === 'edit' ? 'Guardar cambios' : 'Crear cliente'}
          loading={createMutation.isPending || updateMutation.isPending}
          onSubmit={handleFormSubmit}
          onCancel={() => setDrawer(null)}
        />
      </Drawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar cliente"
        description={`¿Seguro que quieres eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
