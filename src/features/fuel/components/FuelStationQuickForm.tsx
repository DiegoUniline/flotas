import { useState, type FormEvent } from 'react'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useCreateFuelStation } from '@/features/fuel/hooks/useFuelStations'
import type { RelationOption } from '@/components/ui/RelationSelect'

interface FuelStationQuickFormProps {
  initialName: string
  onCreated: (option: RelationOption) => void
  onCancel: () => void
}

export function FuelStationQuickForm({ initialName, onCreated, onCancel }: FuelStationQuickFormProps) {
  const [name, setName] = useState(initialName)
  const createMutation = useCreateFuelStation()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    createMutation.mutate(name, {
      onSuccess: (created) => onCreated({ id: created.id, label: created.name }),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Nombre de la gasolinera" htmlFor="fs-name">
        <Input id="fs-name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={createMutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={createMutation.isPending}>
          Crear gasolinera
        </Button>
      </div>
    </form>
  )
}
