import { useState, type FormEvent } from 'react'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  useLocationOptions,
  useVehicleDriverOptions,
  useVehicleGroupOptions,
  useVehicleTypeOptions,
} from '@/features/vehicles/hooks/useVehicles'
import { VEHICLE_STATUSES, type Vehicle, type VehicleInsert } from '@/features/vehicles/api/vehiclesApi'

export interface VehicleFormValues {
  economic_number: string
  plate: string
  vin: string
  brand: string
  model: string
  year: string
  vehicle_type_id: string
  vehicle_group_id: string
  status: string
  location_id: string
  assigned_driver_id: string
  current_odometer: string
  odometer_unit: string
  fuel_type: string
  notes: string
  active: boolean
}

function toFormValues(vehicle?: Vehicle): VehicleFormValues {
  return {
    economic_number: vehicle?.economic_number ?? '',
    plate: vehicle?.plate ?? '',
    vin: vehicle?.vin ?? '',
    brand: vehicle?.brand ?? '',
    model: vehicle?.model ?? '',
    year: vehicle?.year != null ? String(vehicle.year) : '',
    vehicle_type_id: vehicle?.vehicle_type_id ?? '',
    vehicle_group_id: vehicle?.vehicle_group_id ?? '',
    status: vehicle?.status ?? 'available',
    location_id: vehicle?.location_id ?? '',
    assigned_driver_id: vehicle?.assigned_driver_id ?? '',
    current_odometer: vehicle?.current_odometer != null ? String(vehicle.current_odometer) : '',
    odometer_unit: vehicle?.odometer_unit ?? 'km',
    fuel_type: vehicle?.fuel_type ?? '',
    notes: vehicle?.notes ?? '',
    active: vehicle?.active ?? true,
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

export function toVehicleInsert(values: VehicleFormValues): VehicleInsert {
  return {
    economic_number: values.economic_number || null,
    plate: values.plate || null,
    vin: values.vin || null,
    brand: values.brand || null,
    model: values.model || null,
    year: toNullableInt(values.year),
    vehicle_type_id: values.vehicle_type_id,
    vehicle_group_id: values.vehicle_group_id || null,
    status: values.status,
    location_id: values.location_id || null,
    assigned_driver_id: values.assigned_driver_id || null,
    current_odometer: toNullableNumber(values.current_odometer),
    odometer_unit: values.odometer_unit,
    fuel_type: values.fuel_type || null,
    notes: values.notes || null,
    active: values.active,
  }
}

interface VehicleFormProps {
  vehicle?: Vehicle
  submitLabel: string
  loading: boolean
  onSubmit: (values: VehicleFormValues) => void
  onCancel: () => void
}

const SELECT_CLASSNAME =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500'

export function VehicleForm({ vehicle, submitLabel, loading, onSubmit, onCancel }: VehicleFormProps) {
  const [values, setValues] = useState<VehicleFormValues>(() => toFormValues(vehicle))
  const typeOptions = useVehicleTypeOptions()
  const groupOptions = useVehicleGroupOptions()
  const locationOptions = useLocationOptions()
  const driverOptions = useVehicleDriverOptions()

  function update<K extends keyof VehicleFormValues>(key: K, value: VehicleFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Número económico" htmlFor="economic_number">
          <Input
            id="economic_number"
            required
            value={values.economic_number}
            onChange={(e) => update('economic_number', e.target.value)}
          />
        </Field>
        <Field label="Tipo" htmlFor="vehicle_type_id">
          <select
            id="vehicle_type_id"
            required
            value={values.vehicle_type_id}
            onChange={(e) => update('vehicle_type_id', e.target.value)}
            className={SELECT_CLASSNAME}
          >
            <option value="" disabled>
              Selecciona un tipo
            </option>
            {typeOptions.data?.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Placas" htmlFor="plate">
          <Input id="plate" value={values.plate} onChange={(e) => update('plate', e.target.value)} />
        </Field>
        <Field label="Número de serie (VIN)" htmlFor="vin">
          <Input id="vin" value={values.vin} onChange={(e) => update('vin', e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Marca" htmlFor="brand">
          <Input id="brand" value={values.brand} onChange={(e) => update('brand', e.target.value)} />
        </Field>
        <Field label="Modelo" htmlFor="model">
          <Input id="model" value={values.model} onChange={(e) => update('model', e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Año" htmlFor="year">
          <Input id="year" type="number" min="1980" max="2100" value={values.year} onChange={(e) => update('year', e.target.value)} />
        </Field>
        <Field label="Grupo" htmlFor="vehicle_group_id">
          <select
            id="vehicle_group_id"
            value={values.vehicle_group_id}
            onChange={(e) => update('vehicle_group_id', e.target.value)}
            className={SELECT_CLASSNAME}
          >
            <option value="">Sin grupo</option>
            {groupOptions.data?.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Estado" htmlFor="status">
          <select id="status" value={values.status} onChange={(e) => update('status', e.target.value)} className={SELECT_CLASSNAME}>
            {VEHICLE_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sucursal base" htmlFor="location_id">
          <select
            id="location_id"
            value={values.location_id}
            onChange={(e) => update('location_id', e.target.value)}
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
      <div className="grid grid-cols-3 gap-3">
        <Field label="Odómetro" htmlFor="current_odometer">
          <Input
            id="current_odometer"
            type="number"
            step="any"
            value={values.current_odometer}
            onChange={(e) => update('current_odometer', e.target.value)}
          />
        </Field>
        <Field label="Unidad" htmlFor="odometer_unit">
          <select
            id="odometer_unit"
            value={values.odometer_unit}
            onChange={(e) => update('odometer_unit', e.target.value)}
            className={SELECT_CLASSNAME}
          >
            <option value="km">km</option>
            <option value="mi">mi</option>
          </select>
        </Field>
        <Field label="Combustible" htmlFor="fuel_type">
          <Input id="fuel_type" placeholder="Diésel, gasolina..." value={values.fuel_type} onChange={(e) => update('fuel_type', e.target.value)} />
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
        Vehículo activo
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
