import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DetailField, DetailGrid, DetailSection } from '@/components/ui/DetailGrid'
import { InlineField } from '@/components/ui/InlineField'
import { SaveDiscardBar } from '@/components/ui/SaveDiscardBar'
import { Can } from '@/components/Can'
import { MAINTENANCE_CATEGORIES, type MaintenanceType } from '@/features/maintenance/api/maintenanceTypesApi'
import {
  useCreateMaintenanceType,
  useDeleteMaintenanceType,
  useMaintenanceType,
  useUpdateMaintenanceType,
} from '@/features/maintenance/hooks/useMaintenanceTypes'

const CATEGORY_OPTIONS = MAINTENANCE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))

interface Draft {
  name: string
  category: string
  interval_km: string
  interval_days: string
  estimated_cost: string
  notes: string
  active: boolean
}

function toDraft(type?: MaintenanceType): Draft {
  return {
    name: type?.name ?? '',
    category: type?.category ?? 'preventive',
    interval_km: type?.interval_km != null ? String(type.interval_km) : '',
    interval_days: type?.interval_days != null ? String(type.interval_days) : '',
    estimated_cost: type?.estimated_cost != null ? String(type.estimated_cost) : '',
    notes: type?.notes ?? '',
    active: type?.active ?? true,
  }
}

export function MaintenanceTypeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'nuevo'
  const navigate = useNavigate()

  const typeQuery = useMaintenanceType(isNew ? undefined : id)
  const createMutation = useCreateMaintenanceType()
  const updateMutation = useUpdateMaintenanceType()
  const deleteMutation = useDeleteMaintenanceType()

  const [draft, setDraft] = useState<Draft>(() => toDraft())
  const [original, setOriginal] = useState<Draft>(() => toDraft())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (typeQuery.data) {
      const next = toDraft(typeQuery.data)
      setDraft(next)
      setOriginal(next)
    }
  }, [typeQuery.data])

  const dirty = JSON.stringify(draft) !== JSON.stringify(original)

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function handleBack() {
    if (dirty) {
      setLeaveConfirmOpen(true)
    } else {
      navigate('/mantenimientos/tipos')
    }
  }

  function handleSave() {
    if (!draft.name.trim()) {
      setErrors({ name: 'Campo obligatorio' })
      return
    }
    if (draft.interval_km.trim() === '' && draft.interval_days.trim() === '') {
      setErrors({ interval_km: 'Define al menos un intervalo (km o días)', interval_days: 'Define al menos un intervalo (km o días)' })
      return
    }

    const input = {
      name: draft.name,
      category: draft.category,
      interval_km: draft.interval_km.trim() === '' ? null : Number(draft.interval_km),
      interval_days: draft.interval_days.trim() === '' ? null : Number(draft.interval_days),
      estimated_cost: draft.estimated_cost.trim() === '' ? null : Number(draft.estimated_cost),
      notes: draft.notes || null,
      active: draft.active,
    }

    if (isNew) {
      createMutation.mutate(input, {
        onSuccess: (created) => navigate(`/mantenimientos/tipos/${created.id}`, { replace: true }),
      })
    } else if (id) {
      updateMutation.mutate({ id, input }, { onSuccess: () => setOriginal(draft) })
    }
  }

  function handleDiscard() {
    if (isNew) {
      navigate('/mantenimientos/tipos')
    } else {
      setDraft(original)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending
  const type = typeQuery.data

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <button type="button" onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
            <ArrowLeft size={15} strokeWidth={2} />
            Tipos de servicio
          </button>
          {!isNew && type && (
            <Can permission="maintenance.manage">
              <button type="button" onClick={() => setDeleteOpen(true)} className="text-sm font-medium text-red-600 hover:text-red-700">
                Eliminar
              </button>
            </Can>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-white px-6 py-5">
          {!isNew && typeQuery.isLoading && <Skeleton className="h-64" />}
          {!isNew && typeQuery.isError && (
            <ErrorState message="No se pudo cargar el tipo de servicio." onRetry={() => void typeQuery.refetch()} />
          )}

          {(isNew || type) && (
            <div className="flex max-w-3xl flex-col gap-4">
              <div>
                <h1 className="text-xl font-semibold text-ink">{draft.name || (isNew ? 'Nuevo tipo de servicio' : 'Tipo de servicio')}</h1>
                <p className="text-sm text-gray-500">
                  {[
                    draft.interval_km ? `Cada ${Number(draft.interval_km).toLocaleString('es-MX')} km` : null,
                    draft.interval_days ? `Cada ${draft.interval_days} días` : null,
                  ]
                    .filter(Boolean)
                    .join(' o ') || 'Sin intervalo definido'}
                </p>
              </div>

              <DetailSection title="Servicio" description="Nombre, categoría e intervalo de mantenimiento.">
                <DetailGrid>
                  <DetailField label="Nombre" required error={errors.name}>
                    <InlineField value={draft.name} onChange={(v) => update('name', v)} placeholder="Ej. Cambio de aceite" />
                  </DetailField>
                  <DetailField label="Categoría">
                    <InlineField type="buttons" value={draft.category} options={CATEGORY_OPTIONS} onChange={(v) => update('category', v)} />
                  </DetailField>

                  <DetailField label="Cada (km)" error={errors.interval_km}>
                    <InlineField type="number" value={draft.interval_km} onChange={(v) => update('interval_km', v)} placeholder="Ej. 5000" />
                  </DetailField>
                  <DetailField label="Cada (días)" error={errors.interval_days}>
                    <InlineField type="number" value={draft.interval_days} onChange={(v) => update('interval_days', v)} placeholder="Ej. 180" />
                  </DetailField>

                  <DetailField label="Costo estimado">
                    <InlineField type="number" value={draft.estimated_cost} onChange={(v) => update('estimated_cost', v)} placeholder="0.00" />
                  </DetailField>
                  <DetailField label="Activo">
                    <InlineField type="checkbox" value={draft.active ? 'true' : 'false'} onChange={(v) => update('active', v === 'true')} />
                  </DetailField>

                  <DetailField label="Notas" full>
                    <InlineField type="textarea" value={draft.notes} onChange={(v) => update('notes', v)} />
                  </DetailField>
                </DetailGrid>
              </DetailSection>
            </div>
          )}
        </div>

        <SaveDiscardBar dirty={dirty} saving={saving} onSave={handleSave} onDiscard={handleDiscard} />
      </div>

      <ConfirmDialog
        open={leaveConfirmOpen}
        title="Cambios sin guardar"
        description="Si sales ahora perderás los cambios que no has guardado. ¿Quieres continuar?"
        confirmLabel="Salir sin guardar"
        danger
        onConfirm={() => navigate('/mantenimientos/tipos')}
        onCancel={() => setLeaveConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar tipo de servicio"
        description={`¿Seguro que quieres eliminar "${draft.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => id && deleteMutation.mutate(id, { onSuccess: () => navigate('/mantenimientos/tipos') })}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
