import { useState, type FormEvent } from 'react'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AttachmentUploader } from '@/components/attachments/AttachmentUploader'
import {
  CERTIFICATION_STATUSES,
  type DriverCertification,
  type DriverCertificationInsert,
} from '@/features/drivers/api/driverCertificationsApi'

export interface DriverCertificationFormValues {
  certification_type: string
  certification_number: string
  issued_at: string
  expires_at: string
  status: string
}

function toFormValues(certification?: DriverCertification): DriverCertificationFormValues {
  return {
    certification_type: certification?.certification_type ?? '',
    certification_number: certification?.certification_number ?? '',
    issued_at: certification?.issued_at ?? '',
    expires_at: certification?.expires_at ?? '',
    status: certification?.status ?? 'valid',
  }
}

export function toDriverCertificationInsert(values: DriverCertificationFormValues): DriverCertificationInsert {
  return {
    certification_type: values.certification_type,
    certification_number: values.certification_number || null,
    issued_at: values.issued_at || null,
    expires_at: values.expires_at || null,
    status: values.status,
  }
}

interface DriverCertificationFormProps {
  certification?: DriverCertification
  submitLabel: string
  loading: boolean
  onSubmit: (values: DriverCertificationFormValues) => void
  onCancel: () => void
}

const SELECT_CLASSNAME =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500'

export function DriverCertificationForm({
  certification,
  submitLabel,
  loading,
  onSubmit,
  onCancel,
}: DriverCertificationFormProps) {
  const [values, setValues] = useState<DriverCertificationFormValues>(() => toFormValues(certification))

  function update<K extends keyof DriverCertificationFormValues>(key: K, value: DriverCertificationFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Tipo de certificación" htmlFor="certification_type">
        <Input
          id="certification_type"
          required
          placeholder="Materiales peligrosos, montacargas..."
          value={values.certification_type}
          onChange={(e) => update('certification_type', e.target.value)}
        />
      </Field>
      <Field label="Número" htmlFor="certification_number">
        <Input
          id="certification_number"
          value={values.certification_number}
          onChange={(e) => update('certification_number', e.target.value)}
        />
      </Field>
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
          {CERTIFICATION_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </Field>

      {certification && (
        <AttachmentUploader entityType="driver_certification" entityId={certification.id} label="Documento de la certificación" />
      )}

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
