import { RelationSelect } from '@/components/ui/RelationSelect'
import { useOrg } from '@/context/OrgContext'
import { searchDrivers } from '@/features/drivers/api/driversApi'
import { useAssignDriverToVehicle, useUnassignDriverFromVehicle } from '@/features/vehicles/hooks/useVehicleDetail'

interface VehicleAssignmentFieldProps {
  vehicleId: string
  driverId: string | null
  driverLabel: string | null
}

export function VehicleAssignmentField({ vehicleId, driverId, driverLabel }: VehicleAssignmentFieldProps) {
  const { activeOrg } = useOrg()
  const assignMutation = useAssignDriverToVehicle(vehicleId)
  const unassignMutation = useUnassignDriverFromVehicle(vehicleId)

  return (
    <RelationSelect
      value={driverId}
      displayLabel={driverLabel}
      placeholder="Sin asignar"
      onSearch={(query) =>
        searchDrivers(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: `${r.first_name} ${r.last_name}` })))
      }
      onSelect={(option) => {
        if (option) assignMutation.mutate(option.id)
        else unassignMutation.mutate()
      }}
    />
  )
}
