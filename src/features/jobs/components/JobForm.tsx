import { useState, type FormEvent } from 'react'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  useJobCustomerLocationOptions,
  useJobCustomerOptions,
  useJobDriverOptions,
  useJobVehicleOptions,
} from '@/features/jobs/hooks/useJobs'
import { JOB_PRIORITIES, JOB_STATUSES, JOB_TYPES, type Job, type JobInsert } from '@/features/jobs/api/jobsApi'

export interface JobFormValues {
  job_number: string
  job_type: string
  customer_id: string
  customer_location_id: string
  status: string
  priority: string
  scheduled_date: string
  time_window_start: string
  time_window_end: string
  estimated_service_minutes: string
  assigned_driver_id: string
  assigned_vehicle_id: string
  instructions: string
  amount: string
}

function toFormValues(job?: Job): JobFormValues {
  return {
    job_number: job?.job_number ?? '',
    job_type: job?.job_type ?? 'delivery',
    customer_id: job?.customer_id ?? '',
    customer_location_id: job?.customer_location_id ?? '',
    status: job?.status ?? 'pending',
    priority: job?.priority ?? 'normal',
    scheduled_date: job?.scheduled_date ?? '',
    time_window_start: job?.time_window_start ?? '',
    time_window_end: job?.time_window_end ?? '',
    estimated_service_minutes: job?.estimated_service_minutes != null ? String(job.estimated_service_minutes) : '',
    assigned_driver_id: job?.assigned_driver_id ?? '',
    assigned_vehicle_id: job?.assigned_vehicle_id ?? '',
    instructions: job?.instructions ?? '',
    amount: job?.amount != null ? String(job.amount) : '',
  }
}

function toNullableInt(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}

function toNullableNumber(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function toJobInsert(values: JobFormValues): JobInsert {
  return {
    job_number: values.job_number || null,
    job_type: values.job_type,
    customer_id: values.customer_id || null,
    customer_location_id: values.customer_location_id || null,
    status: values.status,
    priority: values.priority,
    scheduled_date: values.scheduled_date || null,
    time_window_start: values.time_window_start || null,
    time_window_end: values.time_window_end || null,
    estimated_service_minutes: toNullableInt(values.estimated_service_minutes),
    assigned_driver_id: values.assigned_driver_id || null,
    assigned_vehicle_id: values.assigned_vehicle_id || null,
    instructions: values.instructions || null,
    amount: toNullableNumber(values.amount),
  }
}

interface JobFormProps {
  job?: Job
  submitLabel: string
  loading: boolean
  onSubmit: (values: JobFormValues) => void
  onCancel: () => void
}

const SELECT_CLASSNAME =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500'

export function JobForm({ job, submitLabel, loading, onSubmit, onCancel }: JobFormProps) {
  const [values, setValues] = useState<JobFormValues>(() => toFormValues(job))
  const customerOptions = useJobCustomerOptions()
  const locationOptions = useJobCustomerLocationOptions(values.customer_id || undefined)
  const driverOptions = useJobDriverOptions()
  const vehicleOptions = useJobVehicleOptions()

  function update<K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Número de pedido" htmlFor="job_number">
          <Input id="job_number" value={values.job_number} onChange={(e) => update('job_number', e.target.value)} />
        </Field>
        <Field label="Tipo" htmlFor="job_type">
          <select id="job_type" value={values.job_type} onChange={(e) => update('job_type', e.target.value)} className={SELECT_CLASSNAME}>
            {JOB_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Cliente" htmlFor="customer_id">
          <select
            id="customer_id"
            value={values.customer_id}
            onChange={(e) => setValues((current) => ({ ...current, customer_id: e.target.value, customer_location_id: '' }))}
            className={SELECT_CLASSNAME}
          >
            <option value="">Sin cliente</option>
            {customerOptions.data?.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Domicilio" htmlFor="customer_location_id">
          <select
            id="customer_location_id"
            value={values.customer_location_id}
            onChange={(e) => update('customer_location_id', e.target.value)}
            disabled={!values.customer_id}
            className={SELECT_CLASSNAME}
          >
            <option value="">Sin domicilio</option>
            {locationOptions.data?.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Estado" htmlFor="status">
          <select id="status" value={values.status} onChange={(e) => update('status', e.target.value)} className={SELECT_CLASSNAME}>
            {JOB_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Prioridad" htmlFor="priority">
          <select id="priority" value={values.priority} onChange={(e) => update('priority', e.target.value)} className={SELECT_CLASSNAME}>
            {JOB_PRIORITIES.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Fecha programada" htmlFor="scheduled_date">
          <Input id="scheduled_date" type="date" value={values.scheduled_date} onChange={(e) => update('scheduled_date', e.target.value)} />
        </Field>
        <Field label="Ventana desde" htmlFor="time_window_start">
          <Input id="time_window_start" type="time" value={values.time_window_start} onChange={(e) => update('time_window_start', e.target.value)} />
        </Field>
        <Field label="Ventana hasta" htmlFor="time_window_end">
          <Input id="time_window_end" type="time" value={values.time_window_end} onChange={(e) => update('time_window_end', e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Operador asignado" htmlFor="assigned_driver_id">
          <select
            id="assigned_driver_id"
            value={values.assigned_driver_id}
            onChange={(e) => update('assigned_driver_id', e.target.value)}
            className={SELECT_CLASSNAME}
          >
            <option value="">Sin asignar</option>
            {driverOptions.data?.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.first_name} {driver.last_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vehículo asignado" htmlFor="assigned_vehicle_id">
          <select
            id="assigned_vehicle_id"
            value={values.assigned_vehicle_id}
            onChange={(e) => update('assigned_vehicle_id', e.target.value)}
            className={SELECT_CLASSNAME}
          >
            <option value="">Sin asignar</option>
            {vehicleOptions.data?.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.economic_number ?? vehicle.plate ?? vehicle.id}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tiempo estimado de servicio (min)" htmlFor="estimated_service_minutes">
          <Input
            id="estimated_service_minutes"
            type="number"
            min="0"
            value={values.estimated_service_minutes}
            onChange={(e) => update('estimated_service_minutes', e.target.value)}
          />
        </Field>
        <Field label="Monto" htmlFor="amount">
          <Input id="amount" type="number" step="0.01" min="0" value={values.amount} onChange={(e) => update('amount', e.target.value)} />
        </Field>
      </div>

      <Field label="Instrucciones" htmlFor="instructions">
        <Input id="instructions" value={values.instructions} onChange={(e) => update('instructions', e.target.value)} />
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
