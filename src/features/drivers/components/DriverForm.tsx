import { useState, type FormEvent } from 'react'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useDriverLocationOptions } from '@/features/drivers/hooks/useDrivers'
import { DRIVER_STATUSES, type Driver, type DriverInsert } from '@/features/drivers/api/driversApi'

export interface DriverFormValues {
  employee_number: string
  first_name: string
  last_name: string
  phone: string
  email: string
  status: string
  hire_date: string
  primary_location_id: string
  emergency_contact_name: string
  emergency_contact_phone: string
  notes: string
  active: boolean
}

function toFormValues(driver?: Driver): DriverFormValues {
  return {
    employee_number: driver?.employee_number ?? '',
    first_name: driver?.first_name ?? '',
    last_name: driver?.last_name ?? '',
    phone: driver?.phone ?? '',
    email: driver?.email ?? '',
    status: driver?.status ?? 'active',
    hire_date: driver?.hire_date ?? '',
    primary_location_id: driver?.primary_location_id ?? '',
    emergency_contact_name: driver?.emergency_contact_name ?? '',
    emergency_contact_phone: driver?.emergency_contact_phone ?? '',
    notes: driver?.notes ?? '',
    active: driver?.active ?? true,
  }
}

export function toDriverInsert(values: DriverFormValues): DriverInsert {
  return {
    employee_number: values.employee_number || null,
    first_name: values.first_name,
    last_name: values.last_name,
    phone: values.phone || null,
    email: values.email || null,
    status: values.status,
    hire_date: values.hire_date || null,
    primary_location_id: values.primary_location_id || null,
    emergency_contact_name: values.emergency_contact_name || null,
    emergency_contact_phone: values.emergency_contact_phone || null,
    notes: values.notes || null,
    active: values.active,
  }
}

interface DriverFormProps {
  driver?: Driver
  submitLabel: string
  loading: boolean
  onSubmit: (values: DriverFormValues) => void
  onCancel: () => void
}

const SELECT_CLASSNAME =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500'

export function DriverForm({ driver, submitLabel, loading, onSubmit, onCancel }: DriverFormProps) {
  const [values, setValues] = useState<DriverFormValues>(() => toFormValues(driver))
  const locationOptions = useDriverLocationOptions()

  function update<K extends keyof DriverFormValues>(key: K, value: DriverFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre" htmlFor="first_name">
          <Input id="first_name" required value={values.first_name} onChange={(e) => update('first_name', e.target.value)} />
        </Field>
        <Field label="Apellido" htmlFor="last_name">
          <Input id="last_name" required value={values.last_name} onChange={(e) => update('last_name', e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Número de empleado" htmlFor="employee_number">
          <Input
            id="employee_number"
            value={values.employee_number}
            onChange={(e) => update('employee_number', e.target.value)}
          />
        </Field>
        <Field label="Estado" htmlFor="status">
          <select id="status" value={values.status} onChange={(e) => update('status', e.target.value)} className={SELECT_CLASSNAME}>
            {DRIVER_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
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
        <Field label="Fecha de ingreso" htmlFor="hire_date">
          <Input id="hire_date" type="date" value={values.hire_date} onChange={(e) => update('hire_date', e.target.value)} />
        </Field>
        <Field label="Sucursal base" htmlFor="primary_location_id">
          <select
            id="primary_location_id"
            value={values.primary_location_id}
            onChange={(e) => update('primary_location_id', e.target.value)}
            className={SELECT_CLASSNAME}
          >
            <option value="">Sin asignar</option>
            {locationOptions.data?.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contacto de emergencia" htmlFor="emergency_contact_name">
          <Input
            id="emergency_contact_name"
            value={values.emergency_contact_name}
            onChange={(e) => update('emergency_contact_name', e.target.value)}
          />
        </Field>
        <Field label="Teléfono de emergencia" htmlFor="emergency_contact_phone">
          <Input
            id="emergency_contact_phone"
            value={values.emergency_contact_phone}
            onChange={(e) => update('emergency_contact_phone', e.target.value)}
          />
        </Field>
      </div>
      <Field label="Notas" htmlFor="notes">
        <Input id="notes" value={values.notes} onChange={(e) => update('notes', e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={values.active}
          onChange={(e) => update('active', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        Operador activo
      </label>
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
