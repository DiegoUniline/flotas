import { useState, type FormEvent } from 'react'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CUSTOMER_STATUSES, type Customer, type CustomerInsert } from '@/features/customers/api/customersApi'

export interface CustomerFormValues {
  code: string
  name: string
  legal_name: string
  phone: string
  email: string
  tax_id: string
  status: string
  notes: string
}

function toFormValues(customer?: Customer): CustomerFormValues {
  return {
    code: customer?.code ?? '',
    name: customer?.name ?? '',
    legal_name: customer?.legal_name ?? '',
    phone: customer?.phone ?? '',
    email: customer?.email ?? '',
    tax_id: customer?.tax_id ?? '',
    status: customer?.status ?? 'active',
    notes: customer?.notes ?? '',
  }
}

export function toCustomerInsert(values: CustomerFormValues): CustomerInsert {
  return {
    code: values.code || null,
    name: values.name,
    legal_name: values.legal_name || null,
    phone: values.phone || null,
    email: values.email || null,
    tax_id: values.tax_id || null,
    status: values.status,
    notes: values.notes || null,
  }
}

interface CustomerFormProps {
  customer?: Customer
  submitLabel: string
  loading: boolean
  onSubmit: (values: CustomerFormValues) => void
  onCancel: () => void
}

const SELECT_CLASSNAME =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500'

export function CustomerForm({ customer, submitLabel, loading, onSubmit, onCancel }: CustomerFormProps) {
  const [values, setValues] = useState<CustomerFormValues>(() => toFormValues(customer))

  function update<K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Nombre" htmlFor="name">
        <Input id="name" required value={values.name} onChange={(e) => update('name', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Código" htmlFor="code">
          <Input id="code" value={values.code} onChange={(e) => update('code', e.target.value)} />
        </Field>
        <Field label="Razón social" htmlFor="legal_name">
          <Input id="legal_name" value={values.legal_name} onChange={(e) => update('legal_name', e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Teléfono" htmlFor="phone">
          <Input id="phone" value={values.phone} onChange={(e) => update('phone', e.target.value)} />
        </Field>
        <Field label="Correo" htmlFor="email">
          <Input id="email" type="email" value={values.email} onChange={(e) => update('email', e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="RFC" htmlFor="tax_id">
          <Input id="tax_id" value={values.tax_id} onChange={(e) => update('tax_id', e.target.value)} />
        </Field>
        <Field label="Estado" htmlFor="status">
          <select id="status" value={values.status} onChange={(e) => update('status', e.target.value)} className={SELECT_CLASSNAME}>
            {CUSTOMER_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Notas" htmlFor="notes">
        <Input id="notes" value={values.notes} onChange={(e) => update('notes', e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
