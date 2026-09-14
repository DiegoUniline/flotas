import { DriverForm, toDriverInsert, type DriverFormValues } from './DriverForm'
import { useCreateDriver } from '@/features/drivers/hooks/useDrivers'
import type { RelationOption } from '@/components/ui/RelationSelect'
import type { Driver } from '@/features/drivers/api/driversApi'

interface DriverQuickCreateProps {
  initialName: string
  onCreated: (option: RelationOption) => void
  onCancel: () => void
}

export function DriverQuickCreate({ initialName, onCreated, onCancel }: DriverQuickCreateProps) {
  const createMutation = useCreateDriver()
  const [firstName, ...rest] = initialName.split(' ')

  function handleSubmit(values: DriverFormValues) {
    createMutation.mutate(toDriverInsert(values), {
      onSuccess: (created) => onCreated({ id: created.id, label: `${created.first_name} ${created.last_name}` }),
    })
  }

  return (
    <DriverForm
      driver={{ first_name: firstName ?? '', last_name: rest.join(' ') } as Driver}
      submitLabel="Crear operador"
      loading={createMutation.isPending}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  )
}
