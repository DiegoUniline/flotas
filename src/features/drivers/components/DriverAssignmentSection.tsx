import { useState } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Field } from '@/components/ui/Field'
import { Can } from '@/components/Can'
import {
  useAssignVehicle,
  useAssignedVehicle,
  useAssignmentHistory,
  useUnassignVehicle,
  useVehicleOptionsForAssignment,
} from '@/features/drivers/hooks/useDriverDetail'
import { formatDateTime } from '@/lib/format'

const SELECT_CLASSNAME =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500'

export function DriverAssignmentSection({ driverId }: { driverId: string }) {
  const assignedVehicleQuery = useAssignedVehicle(driverId)
  const historyQuery = useAssignmentHistory(driverId)
  const vehicleOptions = useVehicleOptionsForAssignment()
  const assignMutation = useAssignVehicle(driverId)
  const unassignMutation = useUnassignVehicle(driverId)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState('')

  function handleAssign() {
    if (!selectedVehicleId) return
    assignMutation.mutate(
      { vehicleId: selectedVehicleId },
      {
        onSuccess: () => {
          setPickerOpen(false)
          setSelectedVehicleId('')
        },
      },
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-ink">Vehículo asignado</h2>

      {assignedVehicleQuery.isLoading ? (
        <Skeleton className="h-10" />
      ) : assignedVehicleQuery.data ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">{assignedVehicleQuery.data.economic_number ?? 'Sin número'}</p>
            <p className="text-xs text-gray-500">{assignedVehicleQuery.data.plate ?? 'Sin placas'}</p>
          </div>
          <Can permission="vehicles.edit">
            <Button
              variant="secondary"
              loading={unassignMutation.isPending}
              onClick={() => unassignMutation.mutate(assignedVehicleQuery.data!.id)}
            >
              Quitar asignación
            </Button>
          </Can>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">Sin vehículo asignado.</p>
          <Can permission="vehicles.edit">
            <Button variant="secondary" onClick={() => setPickerOpen(true)}>
              Asignar vehículo
            </Button>
          </Can>
        </div>
      )}

      {historyQuery.data && historyQuery.data.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Historial</p>
          <ul className="flex flex-col gap-1.5">
            {historyQuery.data.map((entry) => (
              <li key={entry.id} className="text-xs text-gray-600">
                <span className="font-medium text-gray-800">{entry.vehicles?.economic_number ?? entry.vehicles?.plate ?? '—'}</span>{' '}
                {formatDateTime(entry.starts_at)} {entry.ends_at ? `→ ${formatDateTime(entry.ends_at)}` : '· actual'}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Drawer open={pickerOpen} title="Asignar vehículo" onClose={() => setPickerOpen(false)}>
        <div className="flex flex-col gap-4">
          <Field label="Vehículo" htmlFor="assign-vehicle">
            <select
              id="assign-vehicle"
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className={SELECT_CLASSNAME}
            >
              <option value="">Selecciona un vehículo</option>
              {vehicleOptions.data?.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.economic_number ?? vehicle.plate ?? vehicle.id}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPickerOpen(false)} disabled={assignMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleAssign} loading={assignMutation.isPending} disabled={!selectedVehicleId}>
              Asignar
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  )
}
