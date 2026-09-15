import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DetailField, DetailGrid, DetailSection } from '@/components/ui/DetailGrid'
import { InlineField } from '@/components/ui/InlineField'
import { RelationSelect } from '@/components/ui/RelationSelect'
import { SaveDiscardBar } from '@/components/ui/SaveDiscardBar'
import { Tabs } from '@/components/ui/Tabs'
import { HistoryPanel } from '@/components/audit/HistoryPanel'
import { Can } from '@/components/Can'
import { useOrg } from '@/context/OrgContext'
import { supabase } from '@/lib/supabase'
import { searchVehicles } from '@/features/vehicles/api/vehiclesApi'
import { searchMaintenanceTypes } from '@/features/maintenance/api/maintenanceTypesApi'
import { MaintenanceTypeQuickForm } from '@/features/maintenance/components/MaintenanceTypeQuickForm'
import { MaintenanceRecordPartsTab } from '@/features/maintenance/components/MaintenanceRecordPartsTab'
import { MAINTENANCE_RECORD_STATUSES, type MaintenanceRecordWithRelations } from '@/features/maintenance/api/maintenanceRecordsApi'
import {
  useCreateMaintenanceRecord,
  useDeleteMaintenanceRecord,
  useMaintenanceRecord,
  useUpdateMaintenanceRecord,
} from '@/features/maintenance/hooks/useMaintenanceRecords'
import { useMaintenanceRecordParts } from '@/features/maintenance/hooks/useMaintenanceRecordParts'

const STATUS_OPTIONS = MAINTENANCE_RECORD_STATUSES.map((s) => ({ value: s.value, label: s.label }))

interface Draft {
  vehicle_id: string
  vehicle_label: string
  maintenance_type_id: string
  maintenance_type_label: string
  status: string
  scheduled_date: string
  scheduled_odometer: string
  completed_date: string
  completed_odometer: string
  cost: string
  provider: string
  notes: string
}

function vehicleOptionLabel(vehicle: { economic_number: string | null; plate: string | null }): string {
  return [vehicle.economic_number, vehicle.plate].filter(Boolean).join(' · ') || 'Sin identificar'
}

function toDraft(record?: MaintenanceRecordWithRelations): Draft {
  return {
    vehicle_id: record?.vehicle_id ?? '',
    vehicle_label: record?.vehicles ? vehicleOptionLabel(record.vehicles) : '',
    maintenance_type_id: record?.maintenance_type_id ?? '',
    maintenance_type_label: record?.maintenance_types?.name ?? '',
    status: record?.status ?? 'scheduled',
    scheduled_date: record?.scheduled_date ?? '',
    scheduled_odometer: record?.scheduled_odometer != null ? String(record.scheduled_odometer) : '',
    completed_date: record?.completed_date ?? '',
    completed_odometer: record?.completed_odometer != null ? String(record.completed_odometer) : '',
    cost: record?.cost != null ? String(record.cost) : '',
    provider: record?.provider ?? '',
    notes: record?.notes ?? '',
  }
}

export function MaintenanceRecordDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'nuevo'
  const navigate = useNavigate()
  const { activeOrg } = useOrg()
  const [searchParams] = useSearchParams()

  const recordQuery = useMaintenanceRecord(isNew ? undefined : id)
  const partsQuery = useMaintenanceRecordParts(isNew ? undefined : id)
  const createMutation = useCreateMaintenanceRecord()
  const updateMutation = useUpdateMaintenanceRecord()
  const deleteMutation = useDeleteMaintenanceRecord()

  const [draft, setDraft] = useState<Draft>(() => toDraft())
  const [original, setOriginal] = useState<Draft>(() => toDraft())
  const [tab, setTab] = useState('datos')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (recordQuery.data) {
      const next = toDraft(recordQuery.data)
      setDraft(next)
      setOriginal(next)
    }
  }, [recordQuery.data])

  useEffect(() => {
    if (!isNew) return
    const vehicleId = searchParams.get('vehicle_id')
    const maintenanceTypeId = searchParams.get('maintenance_type_id')
    if (!vehicleId && !maintenanceTypeId) return

    async function prefill() {
      const updates: Partial<Draft> = {}
      if (vehicleId) {
        const { data } = await supabase.from('vehicles').select('economic_number, plate').eq('id', vehicleId).single()
        if (data) {
          updates.vehicle_id = vehicleId
          updates.vehicle_label = vehicleOptionLabel(data)
        }
      }
      if (maintenanceTypeId) {
        const { data } = await supabase.from('maintenance_types').select('name').eq('id', maintenanceTypeId).single()
        if (data) {
          updates.maintenance_type_id = maintenanceTypeId
          updates.maintenance_type_label = data.name
        }
      }
      setDraft((current) => {
        const next = { ...current, ...updates }
        setOriginal(next)
        return next
      })
    }
    void prefill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew])

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

  function handleStatusChange(status: string) {
    setDraft((current) => {
      const next = { ...current, status }
      if (status === 'completed' && !current.completed_date) {
        next.completed_date = new Date().toISOString().slice(0, 10)
      }
      return next
    })
  }

  function handleBack() {
    if (dirty) {
      setLeaveConfirmOpen(true)
    } else {
      navigate('/mantenimientos')
    }
  }

  function handleSave() {
    const nextErrors: Record<string, string> = {}
    if (!draft.vehicle_id) nextErrors.vehicle_id = 'Campo obligatorio'
    if (!draft.maintenance_type_id) nextErrors.maintenance_type_id = 'Campo obligatorio'
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const input = {
      vehicle_id: draft.vehicle_id,
      maintenance_type_id: draft.maintenance_type_id,
      status: draft.status,
      scheduled_date: draft.scheduled_date || null,
      scheduled_odometer: draft.scheduled_odometer.trim() === '' ? null : Number(draft.scheduled_odometer),
      completed_date: draft.completed_date || null,
      completed_odometer: draft.completed_odometer.trim() === '' ? null : Number(draft.completed_odometer),
      cost: draft.cost.trim() === '' ? null : Number(draft.cost),
      provider: draft.provider || null,
      notes: draft.notes || null,
    }

    if (isNew) {
      createMutation.mutate(input, {
        onSuccess: (created) => navigate(`/mantenimientos/${created.id}`, { replace: true }),
      })
    } else if (id) {
      updateMutation.mutate({ id, input }, { onSuccess: () => setOriginal(draft) })
    }
  }

  function handleDiscard() {
    if (isNew) {
      navigate('/mantenimientos')
    } else {
      setDraft(original)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending
  const record = recordQuery.data

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <button type="button" onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
            <ArrowLeft size={15} strokeWidth={2} />
            Mantenimientos
          </button>
          {!isNew && record && (
            <Can permission="maintenance.manage">
              <button type="button" onClick={() => setDeleteOpen(true)} className="text-sm font-medium text-red-600 hover:text-red-700">
                Eliminar
              </button>
            </Can>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto bg-white lg:flex-row lg:overflow-hidden">
          <div className="flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:overflow-y-auto">
            {!isNew && recordQuery.isLoading && <Skeleton className="h-64" />}
            {!isNew && recordQuery.isError && (
              <ErrorState message="No se pudo cargar el servicio." onRetry={() => void recordQuery.refetch()} />
            )}

            {(isNew || record) && (
              <div className="flex max-w-4xl flex-col gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-ink">
                    {draft.maintenance_type_label || (isNew ? 'Nuevo servicio' : 'Servicio de mantenimiento')}
                  </h1>
                  <p className="text-sm text-gray-500">{draft.vehicle_label || 'Sin vehículo asignado'}</p>
                </div>

                <DetailSection title="Servicio" description="Vehículo, tipo de servicio y estado.">
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
                    <DetailField label="Tipo de servicio" required error={errors.maintenance_type_id}>
                      <RelationSelect
                        value={draft.maintenance_type_id || null}
                        displayLabel={draft.maintenance_type_label || null}
                        placeholder="Selecciona o crea uno…"
                        onSearch={(query) =>
                          searchMaintenanceTypes(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.name })))
                        }
                        onSelect={(option) => {
                          update('maintenance_type_id', option?.id ?? '')
                          update('maintenance_type_label', option?.label ?? '')
                        }}
                        createLabel="Tipo de servicio"
                        renderCreateForm={({ initialName, onCreated, onCancel }) => (
                          <MaintenanceTypeQuickForm initialName={initialName} onCreated={onCreated} onCancel={onCancel} />
                        )}
                      />
                    </DetailField>

                    <DetailField label="Estado">
                      <InlineField type="buttons" value={draft.status} options={STATUS_OPTIONS} onChange={handleStatusChange} />
                    </DetailField>
                    <DetailField label="Taller / proveedor">
                      <InlineField value={draft.provider} onChange={(v) => update('provider', v)} placeholder="Agregar…" />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Programación" description="Cuándo se programó el servicio (fecha y/o kilometraje).">
                  <DetailGrid>
                    <DetailField label="Fecha programada">
                      <InlineField type="date" value={draft.scheduled_date} onChange={(v) => update('scheduled_date', v)} />
                    </DetailField>
                    <DetailField label="Km programado">
                      <InlineField type="number" value={draft.scheduled_odometer} onChange={(v) => update('scheduled_odometer', v)} placeholder="Agregar…" />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Cierre" description="Cuándo y cómo se completó el servicio.">
                  <DetailGrid>
                    <DetailField label="Fecha completado">
                      <InlineField type="date" value={draft.completed_date} onChange={(v) => update('completed_date', v)} />
                    </DetailField>
                    <DetailField label="Km al completar">
                      <InlineField type="number" value={draft.completed_odometer} onChange={(v) => update('completed_odometer', v)} placeholder="Agregar…" />
                    </DetailField>

                    <DetailField label="Costo">
                      <InlineField type="number" value={draft.cost} onChange={(v) => update('cost', v)} placeholder="0.00" />
                    </DetailField>

                    <DetailField label="Notas" full>
                      <InlineField type="textarea" value={draft.notes} onChange={(v) => update('notes', v)} />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                {!isNew && id && (
                  <div>
                    <Tabs items={[{ key: 'datos', label: 'Detalle' }, { key: 'refacciones', label: 'Refacciones', count: partsQuery.data?.length }]} active={tab} onChange={setTab} />
                    {tab === 'refacciones' && <MaintenanceRecordPartsTab maintenanceRecordId={id} />}
                  </div>
                )}
              </div>
            )}
          </div>

          {!isNew && id && (
            <Can permission="audit.view">
              <div className="shrink-0 border-t border-gray-200 lg:w-80 lg:border-l lg:border-t-0">
                <HistoryPanel entityType="maintenance_records" entityId={id} />
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
        onConfirm={() => navigate('/mantenimientos')}
        onCancel={() => setLeaveConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar servicio"
        description="¿Seguro que quieres eliminar este servicio de mantenimiento? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => id && deleteMutation.mutate(id, { onSuccess: () => navigate('/mantenimientos') })}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
