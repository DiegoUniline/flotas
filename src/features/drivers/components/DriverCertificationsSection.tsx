import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { Can } from '@/components/Can'
import {
  useCreateDriverCertification,
  useDeleteDriverCertification,
  useDriverCertifications,
  useUpdateDriverCertification,
} from '@/features/drivers/hooks/useDriverDetail'
import {
  DriverCertificationForm,
  toDriverCertificationInsert,
  type DriverCertificationFormValues,
} from './DriverCertificationForm'
import { CERTIFICATION_STATUSES, type DriverCertification } from '@/features/drivers/api/driverCertificationsApi'
import { formatDate } from '@/lib/format'

const STATUS_LABELS = Object.fromEntries(CERTIFICATION_STATUSES.map((s) => [s.value, s.label]))
const STATUS_TONE: Record<string, string> = {
  valid: 'bg-status-active-bg text-status-active',
  expired: 'bg-status-delayed-bg text-status-delayed',
}

type DrawerState = { mode: 'create' } | { mode: 'edit'; certification: DriverCertification } | null

export function DriverCertificationsSection({ driverId }: { driverId: string }) {
  const certificationsQuery = useDriverCertifications(driverId)
  const createMutation = useCreateDriverCertification(driverId)
  const updateMutation = useUpdateDriverCertification(driverId)
  const deleteMutation = useDeleteDriverCertification(driverId)
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [deleteTarget, setDeleteTarget] = useState<DriverCertification | null>(null)

  function handleSubmit(values: DriverCertificationFormValues) {
    const input = toDriverCertificationInsert(values)
    if (drawer?.mode === 'edit') {
      updateMutation.mutate({ id: drawer.certification.id, input }, { onSuccess: () => setDrawer(null) })
    } else {
      createMutation.mutate(input, { onSuccess: () => setDrawer(null) })
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Certificaciones</h2>
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

      {certificationsQuery.isLoading ? (
        <Skeleton className="h-16" />
      ) : certificationsQuery.data && certificationsQuery.data.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {certificationsQuery.data.map((certification) => (
            <li key={certification.id} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-gray-900">{certification.certification_type}</p>
                <p className="text-xs text-gray-500">
                  {certification.expires_at ? `Vence ${formatDate(certification.expires_at)}` : 'Sin fecha de vencimiento'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[certification.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {STATUS_LABELS[certification.status] ?? certification.status}
                </span>
                <Can permission="drivers.edit">
                  <button type="button" onClick={() => setDrawer({ mode: 'edit', certification })} className="text-xs font-medium text-gray-600 hover:text-gray-900">
                    Editar
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(certification)} className="text-xs font-medium text-red-600 hover:text-red-700">
                    Eliminar
                  </button>
                </Can>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">Sin certificaciones registradas.</p>
      )}

      <Drawer
        open={drawer !== null}
        title={drawer?.mode === 'edit' ? 'Editar certificación' : 'Nueva certificación'}
        onClose={() => setDrawer(null)}
      >
        <DriverCertificationForm
          certification={drawer?.mode === 'edit' ? drawer.certification : undefined}
          submitLabel={drawer?.mode === 'edit' ? 'Guardar cambios' : 'Agregar certificación'}
          loading={createMutation.isPending || updateMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={() => setDrawer(null)}
        />
      </Drawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar certificación"
        description={`¿Eliminar la certificación "${deleteTarget?.certification_type}"?`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
