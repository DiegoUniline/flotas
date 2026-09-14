import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Pagination } from '@/components/ui/Pagination'
import { Can } from '@/components/Can'
import { LocationsTable } from './components/LocationsTable'
import { LocationForm, toLocationInsert, type LocationFormValues } from './components/LocationForm'
import {
  useCreateLocation,
  useDeleteLocation,
  useLocationsQuery,
  useUpdateLocation,
  PAGE_SIZE,
} from './hooks/useLocations'
import { LOCATION_TYPES, type Location, type LocationFilters, type LocationSort } from './api/locationsApi'
import { PageScroll } from '@/components/ui/PageScroll'

type DrawerState = { mode: 'create' } | { mode: 'edit'; location: Location } | null

export function LocationsPage() {
  const [filters, setFilters] = useState<LocationFilters>({ search: '', locationType: null, active: null })
  const [sort, setSort] = useState<LocationSort>({ column: 'name', direction: 'asc' })
  const [page, setPage] = useState(0)
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null)

  const locationsQuery = useLocationsQuery(filters, sort, page)
  const createMutation = useCreateLocation()
  const updateMutation = useUpdateLocation()
  const deleteMutation = useDeleteLocation()

  const hasFilters = filters.search.trim() !== '' || filters.locationType !== null || filters.active !== null

  function updateFilters(patch: Partial<LocationFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
    setPage(0)
  }

  function handleFormSubmit(values: LocationFormValues) {
    const input = toLocationInsert(values)
    if (drawer?.mode === 'edit') {
      updateMutation.mutate(
        { id: drawer.location.id, input },
        { onSuccess: () => setDrawer(null) },
      )
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
          <h1 className="text-lg font-semibold text-gray-900">Sucursales</h1>
          <p className="text-sm text-gray-500">Ubicaciones operativas de tu organización.</p>
        </div>
        <Can permission="locations.manage">
          <Button onClick={() => setDrawer({ mode: 'create' })}>Nueva sucursal</Button>
        </Can>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar por nombre o código"
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="max-w-xs"
        />
        <select
          value={filters.locationType ?? ''}
          onChange={(e) => updateFilters({ locationType: e.target.value || null })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        >
          <option value="">Todos los tipos</option>
          {LOCATION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
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
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="inactive">Inactivas</option>
        </select>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <LocationsTable
          rows={locationsQuery.data?.rows ?? []}
          loading={locationsQuery.isLoading}
          error={locationsQuery.isError}
          hasFilters={hasFilters}
          sort={sort}
          onSortChange={(next) => {
            setSort(next)
            setPage(0)
          }}
          onRetry={() => void locationsQuery.refetch()}
          onCreate={() => setDrawer({ mode: 'create' })}
          onEdit={(location) => setDrawer({ mode: 'edit', location })}
          onDelete={(location) => setDeleteTarget(location)}
        />
        {!locationsQuery.isLoading && !locationsQuery.isError && (locationsQuery.data?.rows.length ?? 0) > 0 && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={locationsQuery.data?.count ?? 0}
            onPageChange={setPage}
          />
        )}
      </div>

      <Drawer
        open={drawer !== null}
        title={drawer?.mode === 'edit' ? 'Editar sucursal' : 'Nueva sucursal'}
        onClose={() => setDrawer(null)}
      >
        <LocationForm
          location={drawer?.mode === 'edit' ? drawer.location : undefined}
          submitLabel={drawer?.mode === 'edit' ? 'Guardar cambios' : 'Crear sucursal'}
          loading={createMutation.isPending || updateMutation.isPending}
          onSubmit={handleFormSubmit}
          onCancel={() => setDrawer(null)}
        />
      </Drawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar sucursal"
        description={`¿Seguro que quieres eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
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
