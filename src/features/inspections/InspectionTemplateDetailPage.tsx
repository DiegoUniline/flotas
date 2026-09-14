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
import type { InspectionTemplate } from '@/features/inspections/api/inspectionTemplatesApi'
import {
  useCreateInspectionTemplate,
  useDeleteInspectionTemplate,
  useInspectionTemplate,
  useUpdateInspectionTemplate,
} from '@/features/inspections/hooks/useInspectionTemplates'
import { InspectionTemplateItemsEditor } from '@/features/inspections/components/InspectionTemplateItemsEditor'

interface Draft {
  name: string
  active: boolean
}

function toDraft(template?: InspectionTemplate): Draft {
  return {
    name: template?.name ?? '',
    active: template?.active ?? true,
  }
}

export function InspectionTemplateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'nuevo'
  const navigate = useNavigate()

  const templateQuery = useInspectionTemplate(isNew ? undefined : id)
  const createMutation = useCreateInspectionTemplate()
  const updateMutation = useUpdateInspectionTemplate()
  const deleteMutation = useDeleteInspectionTemplate()

  const [draft, setDraft] = useState<Draft>(() => toDraft())
  const [original, setOriginal] = useState<Draft>(() => toDraft())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (templateQuery.data) {
      const next = toDraft(templateQuery.data)
      setDraft(next)
      setOriginal(next)
    }
  }, [templateQuery.data])

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
      navigate('/inspecciones/plantillas')
    }
  }

  function handleSave() {
    if (!draft.name.trim()) {
      setErrors({ name: 'Campo obligatorio' })
      return
    }

    const input = { name: draft.name, active: draft.active }

    if (isNew) {
      createMutation.mutate(input, {
        onSuccess: (created) => navigate(`/inspecciones/plantillas/${created.id}`, { replace: true }),
      })
    } else if (id) {
      updateMutation.mutate({ id, input }, { onSuccess: () => setOriginal(draft) })
    }
  }

  function handleDiscard() {
    if (isNew) {
      navigate('/inspecciones/plantillas')
    } else {
      setDraft(original)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending
  const template = templateQuery.data

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <button type="button" onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
            <ArrowLeft size={15} strokeWidth={2} />
            Plantillas de inspección
          </button>
          {!isNew && template && (
            <Can permission="inspections.perform">
              <button type="button" onClick={() => setDeleteOpen(true)} className="text-sm font-medium text-red-600 hover:text-red-700">
                Eliminar
              </button>
            </Can>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-white px-6 py-5">
          {!isNew && templateQuery.isLoading && <Skeleton className="h-64" />}
          {!isNew && templateQuery.isError && (
            <ErrorState message="No se pudo cargar la plantilla." onRetry={() => void templateQuery.refetch()} />
          )}

          {(isNew || template) && (
            <div className="flex max-w-3xl flex-col gap-4">
              <div>
                <h1 className="text-xl font-semibold text-ink">{draft.name || (isNew ? 'Nueva plantilla' : 'Plantilla de inspección')}</h1>
              </div>

              <DetailSection title="Datos" description="Nombre y estado de la plantilla.">
                <DetailGrid>
                  <DetailField label="Nombre" required error={errors.name}>
                    <InlineField value={draft.name} onChange={(v) => update('name', v)} placeholder="Ej. Inspección diaria" />
                  </DetailField>
                  <DetailField label="Activa">
                    <InlineField type="checkbox" value={draft.active ? 'true' : 'false'} onChange={(v) => update('active', v === 'true')} />
                  </DetailField>
                </DetailGrid>
              </DetailSection>

              {!isNew && id && (
                <DetailSection title="Puntos a revisar" description="Checklist que se aplicará en cada inspección con esta plantilla.">
                  <InspectionTemplateItemsEditor templateId={id} />
                </DetailSection>
              )}
              {isNew && (
                <p className="text-sm text-gray-400">Guarda la plantilla primero para poder agregar los puntos a revisar.</p>
              )}
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
        onConfirm={() => navigate('/inspecciones/plantillas')}
        onCancel={() => setLeaveConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar plantilla"
        description={`¿Seguro que quieres eliminar "${draft.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => id && deleteMutation.mutate(id, { onSuccess: () => navigate('/inspecciones/plantillas') })}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
