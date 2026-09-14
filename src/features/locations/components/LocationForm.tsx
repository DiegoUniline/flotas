import { useState, type FormEvent } from 'react'
import { LocateFixed } from 'lucide-react'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LOCATION_TYPES, type Location, type LocationInsert } from '@/features/locations/api/locationsApi'

export interface LocationFormValues {
  code: string
  name: string
  location_type: string
  phone: string
  address_line_1: string
  address_line_2: string
  city: string
  state: string
  postal_code: string
  country: string
  latitude: string
  longitude: string
  active: boolean
}

function toFormValues(location?: Location): LocationFormValues {
  return {
    code: location?.code ?? '',
    name: location?.name ?? '',
    location_type: location?.location_type ?? 'branch',
    phone: location?.phone ?? '',
    address_line_1: location?.address_line_1 ?? '',
    address_line_2: location?.address_line_2 ?? '',
    city: location?.city ?? '',
    state: location?.state ?? '',
    postal_code: location?.postal_code ?? '',
    country: location?.country ?? 'MX',
    latitude: location?.latitude != null ? String(location.latitude) : '',
    longitude: location?.longitude != null ? String(location.longitude) : '',
    active: location?.active ?? true,
  }
}

function toNullableNumber(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function toLocationInsert(values: LocationFormValues): LocationInsert {
  return {
    code: values.code || null,
    name: values.name,
    location_type: values.location_type,
    phone: values.phone || null,
    address_line_1: values.address_line_1 || null,
    address_line_2: values.address_line_2 || null,
    city: values.city || null,
    state: values.state || null,
    postal_code: values.postal_code || null,
    country: values.country || null,
    latitude: toNullableNumber(values.latitude),
    longitude: toNullableNumber(values.longitude),
    active: values.active,
  }
}

interface LocationFormProps {
  location?: Location
  submitLabel: string
  loading: boolean
  onSubmit: (values: LocationFormValues) => void
  onCancel: () => void
}

export function LocationForm({ location, submitLabel, loading, onSubmit, onCancel }: LocationFormProps) {
  const [values, setValues] = useState<LocationFormValues>(() => toFormValues(location))
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  function update<K extends keyof LocationFormValues>(key: K, value: LocationFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(values)
  }

  function handleUseCurrentLocation() {
    if (!('geolocation' in navigator)) {
      setLocationError('Tu navegador no soporta geolocalización.')
      return
    }
    setLocationError(null)
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValues((current) => ({
          ...current,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }))
        setLocating(false)
      },
      (error) => {
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? 'Permiso de ubicación denegado. Actívalo en tu navegador o teléfono.'
            : 'No se pudo obtener tu ubicación.',
        )
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
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
        <Field label="Tipo" htmlFor="location_type">
          <select
            id="location_type"
            value={values.location_type}
            onChange={(e) => update('location_type', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          >
            {LOCATION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Teléfono" htmlFor="phone">
        <Input id="phone" value={values.phone} onChange={(e) => update('phone', e.target.value)} />
      </Field>
      <Field label="Dirección" htmlFor="address_line_1">
        <Input
          id="address_line_1"
          value={values.address_line_1}
          onChange={(e) => update('address_line_1', e.target.value)}
        />
      </Field>
      <Field label="Dirección (línea 2)" htmlFor="address_line_2">
        <Input
          id="address_line_2"
          value={values.address_line_2}
          onChange={(e) => update('address_line_2', e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ciudad" htmlFor="city">
          <Input id="city" value={values.city} onChange={(e) => update('city', e.target.value)} />
        </Field>
        <Field label="Estado" htmlFor="state">
          <Input id="state" value={values.state} onChange={(e) => update('state', e.target.value)} />
        </Field>
      </div>
      <Field label="Código postal" htmlFor="postal_code">
        <Input
          id="postal_code"
          value={values.postal_code}
          onChange={(e) => update('postal_code', e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitud" htmlFor="latitude">
          <Input
            id="latitude"
            type="number"
            step="any"
            placeholder="19.4326"
            value={values.latitude}
            onChange={(e) => update('latitude', e.target.value)}
          />
        </Field>
        <Field label="Longitud" htmlFor="longitude">
          <Input
            id="longitude"
            type="number"
            step="any"
            placeholder="-99.1332"
            value={values.longitude}
            onChange={(e) => update('longitude', e.target.value)}
          />
        </Field>
      </div>
      <div className="-mt-2 flex items-center gap-3">
        <Button type="button" variant="secondary" loading={locating} onClick={handleUseCurrentLocation}>
          <LocateFixed size={15} strokeWidth={2} />
          Usar mi ubicación
        </Button>
        <p className="text-xs text-gray-400">Toma el GPS de tu teléfono o computadora.</p>
      </div>
      {locationError && <p className="-mt-2 text-xs text-red-600">{locationError}</p>}
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={values.active}
          onChange={(e) => update('active', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        Sucursal activa
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
