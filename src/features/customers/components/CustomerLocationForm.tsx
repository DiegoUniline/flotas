import { useState, type FormEvent } from 'react'
import { LocateFixed } from 'lucide-react'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { CustomerLocation, CustomerLocationInsert } from '@/features/customers/api/customerLocationsApi'

export interface CustomerLocationFormValues {
  name: string
  address: string
  latitude: string
  longitude: string
  contact_name: string
  contact_phone: string
  service_time_minutes: string
  access_notes: string
}

function toFormValues(location?: CustomerLocation): CustomerLocationFormValues {
  return {
    name: location?.name ?? '',
    address: location?.address ?? '',
    latitude: location?.latitude != null ? String(location.latitude) : '',
    longitude: location?.longitude != null ? String(location.longitude) : '',
    contact_name: location?.contact_name ?? '',
    contact_phone: location?.contact_phone ?? '',
    service_time_minutes: location?.service_time_minutes != null ? String(location.service_time_minutes) : '',
    access_notes: location?.access_notes ?? '',
  }
}

function toNullableNumber(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toNullableInt(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}

export function toCustomerLocationInsert(values: CustomerLocationFormValues): CustomerLocationInsert {
  return {
    name: values.name,
    address: values.address || null,
    latitude: toNullableNumber(values.latitude),
    longitude: toNullableNumber(values.longitude),
    contact_name: values.contact_name || null,
    contact_phone: values.contact_phone || null,
    service_time_minutes: toNullableInt(values.service_time_minutes),
    access_notes: values.access_notes || null,
  }
}

interface CustomerLocationFormProps {
  location?: CustomerLocation
  submitLabel: string
  loading: boolean
  onSubmit: (values: CustomerLocationFormValues) => void
  onCancel: () => void
}

export function CustomerLocationForm({ location, submitLabel, loading, onSubmit, onCancel }: CustomerLocationFormProps) {
  const [values, setValues] = useState<CustomerLocationFormValues>(() => toFormValues(location))
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  function update<K extends keyof CustomerLocationFormValues>(key: K, value: CustomerLocationFormValues[K]) {
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
      () => {
        setLocationError('No se pudo obtener tu ubicación.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Nombre del domicilio" htmlFor="cl-name">
        <Input id="cl-name" required placeholder="Sucursal Centro, Bodega..." value={values.name} onChange={(e) => update('name', e.target.value)} />
      </Field>
      <Field label="Dirección" htmlFor="cl-address">
        <Input id="cl-address" value={values.address} onChange={(e) => update('address', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitud" htmlFor="cl-lat">
          <Input id="cl-lat" type="number" step="any" value={values.latitude} onChange={(e) => update('latitude', e.target.value)} />
        </Field>
        <Field label="Longitud" htmlFor="cl-lng">
          <Input id="cl-lng" type="number" step="any" value={values.longitude} onChange={(e) => update('longitude', e.target.value)} />
        </Field>
      </div>
      <Button type="button" variant="secondary" loading={locating} onClick={handleUseCurrentLocation} className="-mt-2 w-fit">
        <LocateFixed size={15} strokeWidth={2} />
        Usar mi ubicación
      </Button>
      {locationError && <p className="-mt-2 text-xs text-red-600">{locationError}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contacto" htmlFor="cl-contact-name">
          <Input id="cl-contact-name" value={values.contact_name} onChange={(e) => update('contact_name', e.target.value)} />
        </Field>
        <Field label="Teléfono de contacto" htmlFor="cl-contact-phone">
          <Input id="cl-contact-phone" value={values.contact_phone} onChange={(e) => update('contact_phone', e.target.value)} />
        </Field>
      </div>
      <Field label="Tiempo estimado de servicio (min)" htmlFor="cl-service-time">
        <Input
          id="cl-service-time"
          type="number"
          min="0"
          value={values.service_time_minutes}
          onChange={(e) => update('service_time_minutes', e.target.value)}
        />
      </Field>
      <Field label="Notas de acceso" htmlFor="cl-access-notes">
        <Input id="cl-access-notes" value={values.access_notes} onChange={(e) => update('access_notes', e.target.value)} />
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
