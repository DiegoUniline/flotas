import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Can } from '@/components/Can'
import {
  useCreateVehicleDocument,
  useDeleteVehicleDocument,
  useUpdateVehicleDocument,
  useVehicleDocuments,
} from '@/features/vehicles/hooks/useVehicleDetail'
import { VehicleDocumentForm, toVehicleDocumentInsert, type VehicleDocumentFormValues } from './VehicleDocumentForm'
import { DOCUMENT_STATUSES, VEHICLE_DOCUMENT_TYPES, type VehicleDocument } from '@/features/vehicles/api/vehicleDocumentsApi'

const TYPE_LABELS = Object.fromEntries(VEHICLE_DOCUMENT_TYPES.map((t) => [t.value, t.label]))
const STATUS_LABELS = Object.fromEntries(DOCUMENT_STATUSES.map((s) => [s.value, s.label]))
const STATUS_TONE: Record<string, string> = {
  valid: 'bg-status-active-bg text-status-active',
  expired: 'bg-status-delayed-bg text-status-delayed',
}

type DrawerState = { mode: 'create' } | { mode: 'edit'; document: VehicleDocument } | null

export function VehicleDocumentsTab({ vehicleId }: { vehicleId: string }) {
  const documentsQuery = useVehicleDocuments(vehicleId)
  const createMutation = useCreateVehicleDocument(vehicleId)
  const updateMutation = useUpdateVehicleDocument(vehicleId)
  const deleteMutation = useDeleteVehicleDocument(vehicleId)
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [deleteTarget, setDeleteTarget] = useState<VehicleDocument | null>(null)

  function handleSubmit(values: VehicleDocumentFormValues) {
    const input = toVehicleDocumentInsert(values)
    if (drawer?.mode === 'edit') {
      updateMutation.mutate({ id: drawer.document.id, input }, { onSuccess: () => setDrawer(null) })
    } else {
      createMutation.mutate(input, { onSuccess: () => setDrawer(null) })
    }
  }

  return (
    <div className="py-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-500">Seguro, tarjeta de circulación, verificación y otros documentos del vehículo.</p>
        <Can permission="vehicles.edit">
          <button
            type="button"
            onClick={() => setDrawer({ mode: 'create' })}
            className="flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
          >
            <Plus size={15} strokeWidth={2} />
            Agregar documento
          </button>
        </Can>
      </div>

      {documentsQuery.isLoading ? (
        <Skeleton className="h-16" />
      ) : documentsQuery.data && documentsQuery.data.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {documentsQuery.data.map((document) => (
            <li key={document.id} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-gray-900">
                  {TYPE_LABELS[document.document_type] ?? document.document_type}
                  {document.document_number && <span className="ml-1.5 text-gray-400">· {document.document_number}</span>}
                </p>
                <p className="text-xs text-gray-500">{document.expires_at ? `Vence ${document.expires_at}` : 'Sin fecha de vencimiento'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[document.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {STATUS_LABELS[document.status] ?? document.status}
                </span>
                <Can permission="vehicles.edit">
                  <button type="button" onClick={() => setDrawer({ mode: 'edit', document })} className="text-xs font-medium text-gray-600 hover:text-gray-900">
                    Editar
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(document)} className="text-xs font-medium text-red-600 hover:text-red-700">
                    Eliminar
                  </button>
                </Can>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Sin documentos" description="Agrega el seguro, tarjeta de circulación u otros documentos del vehículo." />
      )}

      <Drawer open={drawer !== null} title={drawer?.mode === 'edit' ? 'Editar documento' : 'Nuevo documento'} onClose={() => setDrawer(null)}>
        <VehicleDocumentForm
          document={drawer?.mode === 'edit' ? drawer.document : undefined}
          submitLabel={drawer?.mode === 'edit' ? 'Guardar cambios' : 'Agregar documento'}
          loading={createMutation.isPending || updateMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={() => setDrawer(null)}
        />
      </Drawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar documento"
        description={`¿Eliminar "${deleteTarget ? TYPE_LABELS[deleteTarget.document_type] : ''}"?`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
