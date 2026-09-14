import { LocationForm, toLocationInsert, type LocationFormValues } from './LocationForm'
import { useCreateLocation } from '@/features/locations/hooks/useLocations'
import type { RelationOption } from '@/components/ui/RelationSelect'
import type { Location } from '@/features/locations/api/locationsApi'

interface LocationQuickCreateProps {
  initialName: string
  onCreated: (option: RelationOption) => void
  onCancel: () => void
}

export function LocationQuickCreate({ initialName, onCreated, onCancel }: LocationQuickCreateProps) {
  const createMutation = useCreateLocation()

  function handleSubmit(values: LocationFormValues) {
    createMutation.mutate(toLocationInsert(values), {
      onSuccess: (created) => onCreated({ id: created.id, label: created.name }),
    })
  }

  return (
    <LocationForm
      location={{ name: initialName } as Location}
      submitLabel="Crear sucursal"
      loading={createMutation.isPending}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  )
}
