import { useState, type FormEvent } from 'react'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AttachmentUploader } from '@/components/attachments/AttachmentUploader'
import {
  DOCUMENT_STATUSES,
  VEHICLE_DOCUMENT_TYPES,
  type VehicleDocument,
  type VehicleDocumentInsert,
} from '@/features/vehicles/api/vehicleDocumentsApi'

export interface VehicleDocumentFormValues {
  document_type: string
  document_number: string
  issued_at: string
  expires_at: string
  status: string
}

function toFormValues(document?: VehicleDocument): VehicleDocumentFormValues {
  return {
    document_type: document?.document_type ?? 'insurance',
    document_number: document?.document_number ?? '',
    issued_at: document?.issued_at ?? '',
    expires_at: document?.expires_at ?? '',
    status: document?.status ?? 'valid',
  }
}

export function toVehicleDocumentInsert(values: VehicleDocumentFormValues): VehicleDocumentInsert {
  return {
    document_type: values.document_type,
    document_number: values.document_number || null,
    issued_at: values.issued_at || null,
    expires_at: values.expires_at || null,
    status: values.status,
  }
}

interface VehicleDocumentFormProps {
  document?: VehicleDocument
  submitLabel: string
  loading: boolean
  onSubmit: (values: VehicleDocumentFormValues) => void
  onCancel: () => void
}

const SELECT_CLASSNAME =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500'

export function VehicleDocumentForm({ document, submitLabel, loading, onSubmit, onCancel }: VehicleDocumentFormProps) {
  const [values, setValues] = useState<VehicleDocumentFormValues>(() => toFormValues(document))

  function update<K extends keyof VehicleDocumentFormValues>(key: K, value: VehicleDocumentFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo de documento" htmlFor="vd-type">
          <select id="vd-type" value={values.document_type} onChange={(e) => update('document_type', e.target.value)} className={SELECT_CLASSNAME}>
            {VEHICLE_DOCUMENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Número / póliza" htmlFor="vd-number">
          <Input id="vd-number" value={values.document_number} onChange={(e) => update('document_number', e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha de emisión" htmlFor="vd-issued">
          <Input id="vd-issued" type="date" value={values.issued_at} onChange={(e) => update('issued_at', e.target.value)} />
        </Field>
        <Field label="Fecha de vencimiento" htmlFor="vd-expires">
          <Input id="vd-expires" type="date" value={values.expires_at} onChange={(e) => update('expires_at', e.target.value)} />
        </Field>
      </div>
      <Field label="Estado" htmlFor="vd-status">
        <select id="vd-status" value={values.status} onChange={(e) => update('status', e.target.value)} className={SELECT_CLASSNAME}>
          {DOCUMENT_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </Field>

      {document && <AttachmentUploader entityType="vehicle_document" entityId={document.id} label="Archivo del documento" />}

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
