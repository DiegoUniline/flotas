import { CustomerForm, toCustomerInsert, type CustomerFormValues } from './CustomerForm'
import { useCreateCustomer } from '@/features/customers/hooks/useCustomers'
import type { RelationOption } from '@/components/ui/RelationSelect'
import type { Customer } from '@/features/customers/api/customersApi'

interface CustomerQuickCreateProps {
  initialName: string
  onCreated: (option: RelationOption) => void
  onCancel: () => void
}

export function CustomerQuickCreate({ initialName, onCreated, onCancel }: CustomerQuickCreateProps) {
  const createMutation = useCreateCustomer()

  function handleSubmit(values: CustomerFormValues) {
    createMutation.mutate(toCustomerInsert(values), {
      onSuccess: (created) => onCreated({ id: created.id, label: created.name }),
    })
  }

  return (
    <CustomerForm
      customer={{ name: initialName } as Customer}
      submitLabel="Crear cliente"
      loading={createMutation.isPending}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  )
}
