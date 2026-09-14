import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Pagination } from '@/components/ui/Pagination'
import { Can } from '@/components/Can'
import { DriversTable } from './components/DriversTable'
import { DriverForm, toDriverInsert, type DriverFormValues } from './components/DriverForm'
import { useCreateDriver, useDeleteDriver, useDriversQuery, useUpdateDriver, PAGE_SIZE } from './hooks/useDrivers'
import { DRIVER_STATUSES, type Driver, type DriverFilters, type DriverSort } from './api/driversApi'
import { PageScroll } from '@/components/ui/PageScroll'

type DrawerState = { mode: 'create' } | { mode: 'edit'; driver: Driver } | null

export function DriversPage() {
  const [filters, setFilters] = useState<DriverFilters>({ search: '', status: null, active: null })
  const [sort, setSort] = useState<DriverSort>({ column: 'first_name', direction: 'asc' })
  const [page, setPage] = useState(0)
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null)

  const driversQuery = useDriversQuery(filters, sort, page)
  const createMutation = useCreateDriver()
  const updateMutation = useUpdateDriver()
  const deleteMutation = useDeleteDriver()

  const hasFilters = filters.search.trim() !== '' || filters.status !== null || filters.active !== null

  function updateFilters(patch: Partial<DriverFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
    setPage(0)
  }

  function handleFormSubmit(values: DriverFormValues) {
    const input = toDriverInsert(values)
    if (drawer?.mode === 'edit') {
      updateMutation.mutate({ id: drawer.driver.id, input }, { onSuccess: () => setDrawer(null) })
    } else {
      createMutation.mutate(input, { onSuccess: () => setDrawer(null) })
    }
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
  }

  return (
    <PageScroll>
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Operadores</h1>
          <p className="text-sm text-gray-500">Conductores registrados en tu organización.</p>
        </div>
        <Can permission="drivers.create">
          <Button onClick={() => setDrawer({ mode: 'create' })}>Nuevo operador</Button>
        </Can>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar por nombre, empleado o teléfono"
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
          {DRIVER_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        <select
          value={filters.active === null ? '' : filters.active ? 'active' : 'inactive'}
          onChange={(e) => updateFilters({ active: e.target.value === '' ? null : e.target.value === 'active' })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        >
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <DriversTable
          rows={driversQuery.data?.rows ?? []}
          loading={driversQuery.isLoading}
          error={driversQuery.isError}
          hasFilters={hasFilters}
          sort={sort}
          onSortChange={(next) => {
            setSort(next)
            setPage(0)
          }}
          onRetry={() => void driversQuery.refetch()}
          onCreate={() => setDrawer({ mode: 'create' })}
          onEdit={(driver) => setDrawer({ mode: 'edit', driver })}
          onDelete={(driver) => setDeleteTarget(driver)}
        />
        {!driversQuery.isLoading && !driversQuery.isError && (driversQuery.data?.rows.length ?? 0) > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={driversQuery.data?.count ?? 0} onPageChange={setPage} />
        )}
      </div>

      <Drawer
        open={drawer !== null}
        title={drawer?.mode === 'edit' ? 'Editar operador' : 'Nuevo operador'}
        onClose={() => setDrawer(null)}
      >
        <DriverForm
          driver={drawer?.mode === 'edit' ? drawer.driver : undefined}
          submitLabel={drawer?.mode === 'edit' ? 'Guardar cambios' : 'Crear operador'}
          loading={createMutation.isPending || updateMutation.isPending}
          onSubmit={handleFormSubmit}
          onCancel={() => setDrawer(null)}
        />
      </Drawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar operador"
        description={`¿Seguro que quieres eliminar a "${deleteTarget?.first_name} ${deleteTarget?.last_name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
    </PageScroll>
  )
}
