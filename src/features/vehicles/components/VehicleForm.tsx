import { useState, type FormEvent } from 'react'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useLocationOptions } from '@/features/vehicles/hooks/useVehicles'
import { VEHICLE_TYPES, type Vehicle, type VehicleInsert } from '@/features/vehicles/api/vehiclesApi'

export interface VehicleFormValues {
  economic_number: string
  plate: string
  vin: string
  brand: string
  model: string
  year: string
  vehicle_type: string
  location_id: string
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
    vehicle_type: vehicle?.vehicle_type ?? 'truck',
    location_id: vehicle?.location_id ?? '',
    active: vehicle?.active ?? true,
  }
}

function toNullableInt(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}

export function toVehicleInsert(values: VehicleFormValues): VehicleInsert {
  return {
    economic_number: values.economic_number || null,
    plate: values.plate || null,
    vin: values.vin || null,
    brand: values.brand || null,
    model: values.model || null,
    year: toNullableInt(values.year),
    vehicle_type: values.vehicle_type,
    location_id: values.location_id || null,
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

export function VehicleForm({ vehicle, submitLabel, loading, onSubmit, onCancel }: VehicleFormProps) {
  const [values, setValues] = useState<VehicleFormValues>(() => toFormValues(vehicle))
  const locationOptions = useLocationOptions()

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
        <Field label="Tipo" htmlFor="vehicle_type">
          <select
            id="vehicle_type"
            value={values.vehicle_type}
            onChange={(e) => update('vehicle_type', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          >
            {VEHICLE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
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
          <Input
            id="year"
            type="number"
            min="1980"
            max="2100"
            value={values.year}
            onChange={(e) => update('year', e.target.value)}
          />
        </Field>
        <Field label="Sucursal base" htmlFor="location_id">
          <select
            id="location_id"
            value={values.location_id}
            onChange={(e) => update('location_id', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
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
