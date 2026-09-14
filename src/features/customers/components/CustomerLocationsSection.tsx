import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { Can } from '@/components/Can'
import {
  useCreateCustomerLocation,
  useCustomerLocations,
  useDeleteCustomerLocation,
  useUpdateCustomerLocation,
} from '@/features/customers/hooks/useCustomerDetail'
import {
  CustomerLocationForm,
  toCustomerLocationInsert,
  type CustomerLocationFormValues,
} from './CustomerLocationForm'
import type { CustomerLocation } from '@/features/customers/api/customerLocationsApi'

type DrawerState = { mode: 'create' } | { mode: 'edit'; location: CustomerLocation } | null

export function CustomerLocationsSection({ customerId }: { customerId: string }) {
  const locationsQuery = useCustomerLocations(customerId)
  const createMutation = useCreateCustomerLocation(customerId)
  const updateMutation = useUpdateCustomerLocation(customerId)
  const deleteMutation = useDeleteCustomerLocation(customerId)
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [deleteTarget, setDeleteTarget] = useState<CustomerLocation | null>(null)

  function handleSubmit(values: CustomerLocationFormValues) {
    const input = toCustomerLocationInsert(values)
    if (drawer?.mode === 'edit') {
      updateMutation.mutate({ id: drawer.location.id, input }, { onSuccess: () => setDrawer(null) })
    } else {
      createMutation.mutate(input, { onSuccess: () => setDrawer(null) })
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Domicilios</h2>
        <Can permission="jobs.manage">
          <button
            type="button"
            onClick={() => setDrawer({ mode: 'create' })}
            className="flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
          >
            <Plus size={15} strokeWidth={2} />
            Agregar
          </button>
        </Can>
      </div>

      {locationsQuery.isLoading ? (
        <Skeleton className="h-16" />
      ) : locationsQuery.data && locationsQuery.data.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {locationsQuery.data.map((location) => (
            <li key={location.id} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-gray-900">{location.name}</p>
                <p className="text-xs text-gray-500">{location.address ?? 'Sin dirección'}</p>
              </div>
              <Can permission="jobs.manage">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setDrawer({ mode: 'edit', location })} className="text-xs font-medium text-gray-600 hover:text-gray-900">
                    Editar
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(location)} className="text-xs font-medium text-red-600 hover:text-red-700">
                    Eliminar
                  </button>
                </div>
              </Can>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">Sin domicilios registrados.</p>
      )}

      <Drawer open={drawer !== null} title={drawer?.mode === 'edit' ? 'Editar domicilio' : 'Nuevo domicilio'} onClose={() => setDrawer(null)}>
        <CustomerLocationForm
          location={drawer?.mode === 'edit' ? drawer.location : undefined}
          submitLabel={drawer?.mode === 'edit' ? 'Guardar cambios' : 'Agregar domicilio'}
          loading={createMutation.isPending || updateMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={() => setDrawer(null)}
        />
      </Drawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar domicilio"
        description={`¿Eliminar el domicilio "${deleteTarget?.name}"?`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
