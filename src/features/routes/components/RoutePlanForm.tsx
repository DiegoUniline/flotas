import { useState, type FormEvent } from 'react'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useRouteDriverOptions, useRouteLocationOptions, useRouteVehicleOptions } from '@/features/routes/hooks/useRoutes'
import type { RoutePlanInsert } from '@/features/routes/api/routePlansApi'

export interface RoutePlanFormValues {
  route_number: string
  name: string
  scheduled_date: string
  location_id: string
  driver_id: string
  vehicle_id: string
  notes: string
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function toFormValues(): RoutePlanFormValues {
  return {
    route_number: '',
    name: '',
    scheduled_date: todayIso(),
    location_id: '',
    driver_id: '',
    vehicle_id: '',
    notes: '',
  }
}

export function toRoutePlanInsert(values: RoutePlanFormValues): RoutePlanInsert {
  return {
    route_number: values.route_number || null,
    name: values.name || null,
    scheduled_date: values.scheduled_date,
    location_id: values.location_id || null,
    driver_id: values.driver_id || null,
    vehicle_id: values.vehicle_id || null,
    notes: values.notes || null,
  }
}

interface RoutePlanFormProps {
  loading: boolean
  onSubmit: (values: RoutePlanFormValues) => void
  onCancel: () => void
}

const SELECT_CLASSNAME =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500'

export function RoutePlanForm({ loading, onSubmit, onCancel }: RoutePlanFormProps) {
  const [values, setValues] = useState<RoutePlanFormValues>(() => toFormValues())
  const driverOptions = useRouteDriverOptions()
  const vehicleOptions = useRouteVehicleOptions()
  const locationOptions = useRouteLocationOptions()

  function update<K extends keyof RoutePlanFormValues>(key: K, value: RoutePlanFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre de la ruta" htmlFor="rp-name">
          <Input id="rp-name" placeholder="Ruta Norte" value={values.name} onChange={(e) => update('name', e.target.value)} />
        </Field>
        <Field label="Número" htmlFor="rp-number">
          <Input id="rp-number" value={values.route_number} onChange={(e) => update('route_number', e.target.value)} />
        </Field>
      </div>
      <Field label="Fecha" htmlFor="rp-date">
        <Input id="rp-date" type="date" required value={values.scheduled_date} onChange={(e) => update('scheduled_date', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Operador" htmlFor="rp-driver">
          <select id="rp-driver" value={values.driver_id} onChange={(e) => update('driver_id', e.target.value)} className={SELECT_CLASSNAME}>
            <option value="">Sin asignar</option>
            {driverOptions.data?.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.first_name} {driver.last_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vehículo" htmlFor="rp-vehicle">
          <select id="rp-vehicle" value={values.vehicle_id} onChange={(e) => update('vehicle_id', e.target.value)} className={SELECT_CLASSNAME}>
            <option value="">Sin asignar</option>
            {vehicleOptions.data?.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.economic_number ?? vehicle.plate ?? vehicle.id}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Sucursal base" htmlFor="rp-location">
        <select id="rp-location" value={values.location_id} onChange={(e) => update('location_id', e.target.value)} className={SELECT_CLASSNAME}>
          <option value="">Sin asignar</option>
          {locationOptions.data?.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Notas" htmlFor="rp-notes">
        <Input id="rp-notes" value={values.notes} onChange={(e) => update('notes', e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Crear ruta
        </Button>
      </div>
    </form>
  )
}
