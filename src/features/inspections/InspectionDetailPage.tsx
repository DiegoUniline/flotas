import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DetailField, DetailGrid, DetailSection } from '@/components/ui/DetailGrid'
import { InlineField } from '@/components/ui/InlineField'
import { RelationSelect } from '@/components/ui/RelationSelect'
import { SaveDiscardBar } from '@/components/ui/SaveDiscardBar'
import { HistoryPanel } from '@/components/audit/HistoryPanel'
import { Can } from '@/components/Can'
import { useOrg } from '@/context/OrgContext'
import { searchVehicles } from '@/features/vehicles/api/vehiclesApi'
import { searchDrivers } from '@/features/drivers/api/driversApi'
import { searchInspectionTemplates } from '@/features/inspections/api/inspectionTemplatesApi'
import { fetchInspectionTemplateItems } from '@/features/inspections/api/inspectionTemplateItemsApi'
import { saveInspectionItemResults } from '@/features/inspections/api/inspectionItemResultsApi'
import { INSPECTION_RESULTS, type InspectionWithRelations } from '@/features/inspections/api/inspectionsApi'
import { useCreateInspection, useDeleteInspection, useInspection, useUpdateInspection } from '@/features/inspections/hooks/useInspections'
import { useInspectionItemResults, useSaveInspectionItemResults } from '@/features/inspections/hooks/useInspectionItemResults'
import { InspectionChecklist, type ChecklistItemDraft } from '@/features/inspections/components/InspectionChecklist'

const RESULT_LABEL = Object.fromEntries(INSPECTION_RESULTS.map((r) => [r.value, r.label]))
const RESULT_TONE: Record<string, string> = {
  pass: 'bg-status-active-bg text-status-active',
  fail: 'bg-status-delayed-bg text-status-delayed',
}

interface Draft {
  vehicle_id: string
  vehicle_label: string
  driver_id: string
  driver_label: string
  template_id: string
  template_label: string
  performed_at: string
  odometer: string
  notes: string
}

function vehicleOptionLabel(vehicle: { economic_number: string | null; plate: string | null }): string {
  return [vehicle.economic_number, vehicle.plate].filter(Boolean).join(' · ') || 'Sin identificar'
}

function toLocalDateTimeInput(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toDraft(inspection?: InspectionWithRelations): Draft {
  return {
    vehicle_id: inspection?.vehicle_id ?? '',
    vehicle_label: inspection?.vehicles ? vehicleOptionLabel(inspection.vehicles) : '',
    driver_id: inspection?.driver_id ?? '',
    driver_label: inspection?.drivers ? `${inspection.drivers.first_name} ${inspection.drivers.last_name}` : '',
    template_id: inspection?.template_id ?? '',
    template_label: inspection?.inspection_templates?.name ?? '',
    performed_at: inspection ? toLocalDateTimeInput(inspection.performed_at) : toLocalDateTimeInput(new Date().toISOString()),
    odometer: inspection?.odometer != null ? String(inspection.odometer) : '',
    notes: inspection?.notes ?? '',
  }
}

export function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'nuevo'
  const navigate = useNavigate()
  const { activeOrg } = useOrg()

  const inspectionQuery = useInspection(isNew ? undefined : id)
  const resultsQuery = useInspectionItemResults(isNew ? undefined : id)
  const createMutation = useCreateInspection()
  const updateMutation = useUpdateInspection()
  const deleteMutation = useDeleteInspection()
  const saveResultsMutation = useSaveInspectionItemResults(isNew ? '' : (id ?? ''))

  const [draft, setDraft] = useState<Draft>(() => toDraft())
  const [original, setOriginal] = useState<Draft>(() => toDraft())
  const [checklist, setChecklist] = useState<ChecklistItemDraft[]>([])
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (inspectionQuery.data) {
      const next = toDraft(inspectionQuery.data)
      setDraft(next)
      setOriginal(next)
    }
  }, [inspectionQuery.data])

  useEffect(() => {
    if (!draft.template_id) {
      setChecklist([])
      return
    }
    let cancelled = false
    setChecklistLoading(true)
    fetchInspectionTemplateItems(draft.template_id)
      .then((items) => {
        if (cancelled) return
        const existingByItem = new Map((resultsQuery.data ?? []).map((r) => [r.template_item_id, r]))
        setChecklist(
          items.map((item) => {
            const existing = existingByItem.get(item.id)
            return {
              templateItemId: item.id,
              label: item.label,
              result: existing?.result ?? 'ok',
              notes: existing?.notes ?? '',
            }
          }),
        )
      })
      .finally(() => {
        if (!cancelled) setChecklistLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.template_id, resultsQuery.data])

  const dirty = JSON.stringify(draft) !== JSON.stringify(original)

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (dirty) event.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty])

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function updateChecklistItem(templateItemId: string, patch: Partial<Pick<ChecklistItemDraft, 'result' | 'notes'>>) {
    setChecklist((current) => current.map((item) => (item.templateItemId === templateItemId ? { ...item, ...patch } : item)))
  }

  function handleBack() {
    if (dirty) {
      setLeaveConfirmOpen(true)
    } else {
      navigate('/inspecciones')
    }
  }

  function handleSave() {
    const nextErrors: Record<string, string> = {}
    if (!draft.vehicle_id) nextErrors.vehicle_id = 'Campo obligatorio'
    if (!draft.template_id) nextErrors.template_id = 'Campo obligatorio'
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const overallResult = checklist.some((item) => item.result === 'issue') ? 'fail' : 'pass'

    const input = {
      vehicle_id: draft.vehicle_id,
      driver_id: draft.driver_id || null,
      template_id: draft.template_id,
      performed_at: draft.performed_at ? new Date(draft.performed_at).toISOString() : new Date().toISOString(),
      odometer: draft.odometer.trim() === '' ? null : Number(draft.odometer),
      overall_result: overallResult,
      notes: draft.notes || null,
    }

    const itemInputs = checklist.map((item) => ({ template_item_id: item.templateItemId, result: item.result, notes: item.notes || null }))

    if (isNew) {
      createMutation.mutate(input, {
        onSuccess: async (created) => {
          if (itemInputs.length > 0 && activeOrg) {
            await saveInspectionItemResults(activeOrg.id, created.id, itemInputs)
          }
          navigate(`/inspecciones/${created.id}`, { replace: true })
        },
      })
    } else if (id) {
      updateMutation.mutate(
        { id, input },
        {
          onSuccess: () => {
            setOriginal(draft)
            if (itemInputs.length > 0) saveResultsMutation.mutate(itemInputs)
          },
        },
      )
    }
  }

  function handleDiscard() {
    if (isNew) {
      navigate('/inspecciones')
    } else {
      setDraft(original)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending || saveResultsMutation.isPending
  const inspection = inspectionQuery.data

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <button type="button" onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
            <ArrowLeft size={15} strokeWidth={2} />
            Inspecciones
          </button>
          {!isNew && inspection && (
            <Can permission="inspections.perform">
              <button type="button" onClick={() => setDeleteOpen(true)} className="text-sm font-medium text-red-600 hover:text-red-700">
                Eliminar
              </button>
            </Can>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {!isNew && inspectionQuery.isLoading && <Skeleton className="h-64" />}
            {!isNew && inspectionQuery.isError && (
              <ErrorState message="No se pudo cargar la inspección." onRetry={() => void inspectionQuery.refetch()} />
            )}

            {(isNew || inspection) && (
              <div className="flex max-w-4xl flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-semibold text-ink">{draft.template_label || (isNew ? 'Nueva inspección' : 'Inspección')}</h1>
                    <p className="text-sm text-gray-500">{draft.vehicle_label || 'Sin vehículo asignado'}</p>
                  </div>
                  {inspection && (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${RESULT_TONE[inspection.overall_result] ?? 'bg-gray-100 text-gray-500'}`}>
                      {RESULT_LABEL[inspection.overall_result] ?? inspection.overall_result}
                    </span>
                  )}
                </div>

                <DetailSection title="Datos de la inspección" description="Vehículo, operador y plantilla aplicada.">
                  <DetailGrid>
                    <DetailField label="Vehículo" required error={errors.vehicle_id}>
                      <RelationSelect
                        value={draft.vehicle_id || null}
                        displayLabel={draft.vehicle_label || null}
                        placeholder="Selecciona un vehículo"
                        onSearch={(query) =>
                          searchVehicles(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: vehicleOptionLabel(r) })))
                        }
                        onSelect={(option) => {
                          update('vehicle_id', option?.id ?? '')
                          update('vehicle_label', option?.label ?? '')
                        }}
                      />
                    </DetailField>
                    <DetailField label="Operador">
                      <RelationSelect
                        value={draft.driver_id || null}
                        displayLabel={draft.driver_label || null}
                        placeholder="Sin asignar"
                        onSearch={(query) =>
                          searchDrivers(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: `${r.first_name} ${r.last_name}` })))
                        }
                        onSelect={(option) => {
                          update('driver_id', option?.id ?? '')
                          update('driver_label', option?.label ?? '')
                        }}
                      />
                    </DetailField>

                    <DetailField label="Plantilla" required error={errors.template_id}>
                      <RelationSelect
                        value={draft.template_id || null}
                        displayLabel={draft.template_label || null}
                        placeholder="Selecciona una plantilla"
                        onSearch={(query) =>
                          searchInspectionTemplates(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.name })))
                        }
                        onSelect={(option) => {
                          update('template_id', option?.id ?? '')
                          update('template_label', option?.label ?? '')
                        }}
                      />
                    </DetailField>
                    <DetailField label="Fecha y hora">
                      <input
                        type="datetime-local"
                        value={draft.performed_at}
                        onChange={(e) => update('performed_at', e.target.value)}
                        className="w-full border-0 border-b-2 border-transparent bg-transparent px-1.5 py-1 text-sm text-gray-900 transition-colors hover:border-gray-200 focus:border-accent-500 focus:outline-none"
                      />
                    </DetailField>

                    <DetailField label="Odómetro">
                      <InlineField type="number" value={draft.odometer} onChange={(v) => update('odometer', v)} placeholder="Agregar…" />
                    </DetailField>

                    <DetailField label="Notas" full>
                      <InlineField type="textarea" value={draft.notes} onChange={(v) => update('notes', v)} />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Checklist" description="Marca cada punto revisado. Si algún punto queda en 'Problema', la inspección se marca automáticamente como 'Con problemas'.">
                  {!draft.template_id ? (
                    <p className="text-sm text-gray-400">Selecciona una plantilla para ver su checklist.</p>
                  ) : checklistLoading ? (
                    <Skeleton className="h-24" />
                  ) : (
                    <InspectionChecklist items={checklist} onChange={updateChecklistItem} />
                  )}
                </DetailSection>
              </div>
            )}
          </div>

          {!isNew && id && (
            <Can permission="audit.view">
              <div className="w-80 shrink-0 border-l border-gray-200">
                <HistoryPanel entityType="inspections" entityId={id} />
              </div>
            </Can>
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
        onConfirm={() => navigate('/inspecciones')}
        onCancel={() => setLeaveConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar inspección"
        description="¿Seguro que quieres eliminar esta inspección? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => id && deleteMutation.mutate(id, { onSuccess: () => navigate('/inspecciones') })}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
