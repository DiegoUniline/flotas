import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { Can } from '@/components/Can'
import {
  useCreateDriverLicense,
  useDeleteDriverLicense,
  useDriverLicenses,
  useUpdateDriverLicense,
} from '@/features/drivers/hooks/useDriverDetail'
import {
  DriverLicenseForm,
  toDriverLicenseInsert,
  type DriverLicenseFormValues,
} from './DriverLicenseForm'
import { LICENSE_STATUSES, type DriverLicense } from '@/features/drivers/api/driverLicensesApi'
import { formatDate } from '@/lib/format'

const STATUS_LABELS = Object.fromEntries(LICENSE_STATUSES.map((s) => [s.value, s.label]))
const STATUS_TONE: Record<string, string> = {
  valid: 'bg-status-active-bg text-status-active',
  expired: 'bg-status-delayed-bg text-status-delayed',
  suspended: 'bg-status-stopped-bg text-status-stopped',
}

type DrawerState = { mode: 'create' } | { mode: 'edit'; license: DriverLicense } | null

export function DriverLicensesSection({ driverId }: { driverId: string }) {
  const licensesQuery = useDriverLicenses(driverId)
  const createMutation = useCreateDriverLicense(driverId)
  const updateMutation = useUpdateDriverLicense(driverId)
  const deleteMutation = useDeleteDriverLicense(driverId)
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [deleteTarget, setDeleteTarget] = useState<DriverLicense | null>(null)

  function handleSubmit(values: DriverLicenseFormValues) {
    const input = toDriverLicenseInsert(values)
    if (drawer?.mode === 'edit') {
      updateMutation.mutate({ id: drawer.license.id, input }, { onSuccess: () => setDrawer(null) })
    } else {
      createMutation.mutate(input, { onSuccess: () => setDrawer(null) })
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Licencias</h2>
        <Can permission="drivers.edit">
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

      {licensesQuery.isLoading ? (
        <Skeleton className="h-16" />
      ) : licensesQuery.data && licensesQuery.data.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {licensesQuery.data.map((license) => (
            <li key={license.id} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-gray-900">
                  {license.license_number}
                  {license.license_type && <span className="ml-1.5 text-gray-500">· {license.license_type}</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {license.expires_at ? `Vence ${formatDate(license.expires_at)}` : 'Sin fecha de vencimiento'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[license.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {STATUS_LABELS[license.status] ?? license.status}
                </span>
                <Can permission="drivers.edit">
                  <button type="button" onClick={() => setDrawer({ mode: 'edit', license })} className="text-xs font-medium text-gray-600 hover:text-gray-900">
                    Editar
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(license)} className="text-xs font-medium text-red-600 hover:text-red-700">
                    Eliminar
                  </button>
                </Can>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">Sin licencias registradas.</p>
      )}

      <Drawer open={drawer !== null} title={drawer?.mode === 'edit' ? 'Editar licencia' : 'Nueva licencia'} onClose={() => setDrawer(null)}>
        <DriverLicenseForm
          license={drawer?.mode === 'edit' ? drawer.license : undefined}
          submitLabel={drawer?.mode === 'edit' ? 'Guardar cambios' : 'Agregar licencia'}
          loading={createMutation.isPending || updateMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={() => setDrawer(null)}
        />
      </Drawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar licencia"
        description={`¿Eliminar la licencia "${deleteTarget?.license_number}"?`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
