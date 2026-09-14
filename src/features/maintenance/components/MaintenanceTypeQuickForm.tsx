import { useState, type FormEvent } from 'react'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MAINTENANCE_CATEGORIES } from '@/features/maintenance/api/maintenanceTypesApi'
import { useCreateMaintenanceType } from '@/features/maintenance/hooks/useMaintenanceTypes'
import type { RelationOption } from '@/components/ui/RelationSelect'

interface MaintenanceTypeQuickFormProps {
  initialName: string
  onCreated: (option: RelationOption) => void
  onCancel: () => void
}

const SELECT_CLASSNAME =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500'

export function MaintenanceTypeQuickForm({ initialName, onCreated, onCancel }: MaintenanceTypeQuickFormProps) {
  const [name, setName] = useState(initialName)
  const [category, setCategory] = useState('preventive')
  const [intervalKm, setIntervalKm] = useState('')
  const [intervalDays, setIntervalDays] = useState('')
  const createMutation = useCreateMaintenanceType()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    createMutation.mutate(
      {
        name,
        category,
        interval_km: intervalKm.trim() === '' ? null : Number(intervalKm),
        interval_days: intervalDays.trim() === '' ? null : Number(intervalDays),
      },
      { onSuccess: (created) => onCreated({ id: created.id, label: created.name }) },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Nombre del servicio" htmlFor="mt-name">
        <Input id="mt-name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Categoría" htmlFor="mt-category">
        <select id="mt-category" value={category} onChange={(e) => setCategory(e.target.value)} className={SELECT_CLASSNAME}>
          {MAINTENANCE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cada (km)" htmlFor="mt-km">
          <Input id="mt-km" type="number" value={intervalKm} onChange={(e) => setIntervalKm(e.target.value)} placeholder="Ej. 5000" />
        </Field>
        <Field label="Cada (días)" htmlFor="mt-days">
          <Input id="mt-days" type="number" value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} placeholder="Ej. 180" />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={createMutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={createMutation.isPending}>
          Crear tipo
        </Button>
      </div>
    </form>
  )
}
