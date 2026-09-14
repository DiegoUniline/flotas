import { CustomerLocationForm, toCustomerLocationInsert, type CustomerLocationFormValues } from './CustomerLocationForm'
import { useCreateCustomerLocation } from '@/features/customers/hooks/useCustomerDetail'
import type { RelationOption } from '@/components/ui/RelationSelect'
import type { CustomerLocation } from '@/features/customers/api/customerLocationsApi'

interface CustomerLocationQuickCreateProps {
  customerId: string
  initialName: string
  onCreated: (option: RelationOption) => void
  onCancel: () => void
}

export function CustomerLocationQuickCreate({ customerId, initialName, onCreated, onCancel }: CustomerLocationQuickCreateProps) {
  const createMutation = useCreateCustomerLocation(customerId)

  function handleSubmit(values: CustomerLocationFormValues) {
    createMutation.mutate(toCustomerLocationInsert(values), {
      onSuccess: (created) => onCreated({ id: created.id, label: created.name }),
    })
  }

  return (
    <CustomerLocationForm
      location={{ name: initialName } as CustomerLocation}
      submitLabel="Crear domicilio"
      loading={createMutation.isPending}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  )
}
