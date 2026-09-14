import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Pagination } from '@/components/ui/Pagination'
import { Can } from '@/components/Can'
import { VehiclesTable } from './components/VehiclesTable'
import { VehicleForm, toVehicleInsert, type VehicleFormValues } from './components/VehicleForm'
import {
  useCreateVehicle,
  useDeleteVehicle,
  useVehiclesQuery,
  useUpdateVehicle,
  useVehicleTypeOptions,
  PAGE_SIZE,
} from './hooks/useVehicles'
import { VEHICLE_STATUSES, type VehicleFilters, type VehicleSort, type VehicleWithRelations } from './api/vehiclesApi'

type DrawerState = { mode: 'create' } | { mode: 'edit'; vehicle: VehicleWithRelations } | null

const SELECT_CLASSNAME =
  'rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500'

export function VehiclesPage() {
  const [filters, setFilters] = useState<VehicleFilters>({ search: '', vehicleTypeId: null, status: null, active: null })
  const [sort, setSort] = useState<VehicleSort>({ column: 'economic_number', direction: 'asc' })
  const [page, setPage] = useState(0)
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [deleteTarget, setDeleteTarget] = useState<VehicleWithRelations | null>(null)

  const vehiclesQuery = useVehiclesQuery(filters, sort, page)
  const typeOptions = useVehicleTypeOptions()
  const createMutation = useCreateVehicle()
  const updateMutation = useUpdateVehicle()
  const deleteMutation = useDeleteVehicle()

  const hasFilters =
    filters.search.trim() !== '' || filters.vehicleTypeId !== null || filters.status !== null || filters.active !== null

  function updateFilters(patch: Partial<VehicleFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
    setPage(0)
  }

  function handleFormSubmit(values: VehicleFormValues) {
    const input = toVehicleInsert(values)
    if (drawer?.mode === 'edit') {
      updateMutation.mutate({ id: drawer.vehicle.id, input }, { onSuccess: () => setDrawer(null) })
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
          <h1 className="text-lg font-semibold text-ink">Vehículos</h1>
          <p className="text-sm text-gray-500">Flota registrada de tu organización.</p>
        </div>
        <Can permission="vehicles.create">
          <Button onClick={() => setDrawer({ mode: 'create' })}>Nuevo vehículo</Button>
        </Can>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar por número, placa o marca"
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="max-w-xs"
        />
        <select
          value={filters.vehicleTypeId ?? ''}
          onChange={(e) => updateFilters({ vehicleTypeId: e.target.value || null })}
          className={SELECT_CLASSNAME}
        >
          <option value="">Todos los tipos</option>
          {typeOptions.data?.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        <select value={filters.status ?? ''} onChange={(e) => updateFilters({ status: e.target.value || null })} className={SELECT_CLASSNAME}>
          <option value="">Todos los estados</option>
          {VEHICLE_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        <select
          value={filters.active === null ? '' : filters.active ? 'active' : 'inactive'}
          onChange={(e) =>
            updateFilters({
              active: e.target.value === '' ? null : e.target.value === 'active',
            })
          }
          className={SELECT_CLASSNAME}
        >
          <option value="">Activos e inactivos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <VehiclesTable
          rows={vehiclesQuery.data?.rows ?? []}
          loading={vehiclesQuery.isLoading}
          error={vehiclesQuery.isError}
          hasFilters={hasFilters}
          sort={sort}
          onSortChange={(next) => {
            setSort(next)
            setPage(0)
          }}
          onRetry={() => void vehiclesQuery.refetch()}
          onCreate={() => setDrawer({ mode: 'create' })}
          onEdit={(vehicle) => setDrawer({ mode: 'edit', vehicle })}
          onDelete={(vehicle) => setDeleteTarget(vehicle)}
        />
        {!vehiclesQuery.isLoading && !vehiclesQuery.isError && (vehiclesQuery.data?.rows.length ?? 0) > 0 && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={vehiclesQuery.data?.count ?? 0}
            onPageChange={setPage}
          />
        )}
      </div>

      <Drawer
        open={drawer !== null}
        title={drawer?.mode === 'edit' ? 'Editar vehículo' : 'Nuevo vehículo'}
        onClose={() => setDrawer(null)}
      >
        <VehicleForm
          vehicle={drawer?.mode === 'edit' ? drawer.vehicle : undefined}
          submitLabel={drawer?.mode === 'edit' ? 'Guardar cambios' : 'Crear vehículo'}
          loading={createMutation.isPending || updateMutation.isPending}
          onSubmit={handleFormSubmit}
          onCancel={() => setDrawer(null)}
        />
      </Drawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar vehículo"
        description={`¿Seguro que quieres eliminar "${deleteTarget?.economic_number ?? deleteTarget?.plate}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
