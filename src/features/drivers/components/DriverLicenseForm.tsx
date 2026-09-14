import { useState, type FormEvent } from 'react'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AttachmentUploader } from '@/components/attachments/AttachmentUploader'
import { LICENSE_STATUSES, type DriverLicense, type DriverLicenseInsert } from '@/features/drivers/api/driverLicensesApi'

export interface DriverLicenseFormValues {
  license_number: string
  license_type: string
  issuing_state: string
  issued_at: string
  expires_at: string
  status: string
}

function toFormValues(license?: DriverLicense): DriverLicenseFormValues {
  return {
    license_number: license?.license_number ?? '',
    license_type: license?.license_type ?? '',
    issuing_state: license?.issuing_state ?? '',
    issued_at: license?.issued_at ?? '',
    expires_at: license?.expires_at ?? '',
    status: license?.status ?? 'valid',
  }
}

export function toDriverLicenseInsert(values: DriverLicenseFormValues): DriverLicenseInsert {
  return {
    license_number: values.license_number,
    license_type: values.license_type || null,
    issuing_state: values.issuing_state || null,
    issued_at: values.issued_at || null,
    expires_at: values.expires_at || null,
    status: values.status,
  }
}

interface DriverLicenseFormProps {
  license?: DriverLicense
  submitLabel: string
  loading: boolean
  onSubmit: (values: DriverLicenseFormValues) => void
  onCancel: () => void
}

const SELECT_CLASSNAME =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500'

export function DriverLicenseForm({ license, submitLabel, loading, onSubmit, onCancel }: DriverLicenseFormProps) {
  const [values, setValues] = useState<DriverLicenseFormValues>(() => toFormValues(license))

  function update<K extends keyof DriverLicenseFormValues>(key: K, value: DriverLicenseFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Número de licencia" htmlFor="license_number">
        <Input
          id="license_number"
          required
          value={values.license_number}
          onChange={(e) => update('license_number', e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo" htmlFor="license_type">
          <Input id="license_type" placeholder="Tipo B, federal..." value={values.license_type} onChange={(e) => update('license_type', e.target.value)} />
        </Field>
        <Field label="Estado emisor" htmlFor="issuing_state">
          <Input id="issuing_state" value={values.issuing_state} onChange={(e) => update('issuing_state', e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha de emisión" htmlFor="issued_at">
          <Input id="issued_at" type="date" value={values.issued_at} onChange={(e) => update('issued_at', e.target.value)} />
        </Field>
        <Field label="Fecha de vencimiento" htmlFor="expires_at">
          <Input id="expires_at" type="date" value={values.expires_at} onChange={(e) => update('expires_at', e.target.value)} />
        </Field>
      </div>
      <Field label="Estado" htmlFor="status">
        <select id="status" value={values.status} onChange={(e) => update('status', e.target.value)} className={SELECT_CLASSNAME}>
          {LICENSE_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </Field>

      {license && <AttachmentUploader entityType="driver_license" entityId={license.id} label="Foto o PDF de la licencia" />}

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
