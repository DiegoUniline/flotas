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
import { formatDateTime } from '@/lib/format'
import {
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  type IncidentWithRelations,
} from '@/features/incidents/api/incidentsApi'
import { useCreateIncident, useDeleteIncident, useIncident, useUpdateIncident } from '@/features/incidents/hooks/useIncidents'

const TYPE_OPTIONS = INCIDENT_TYPES.map((t) => ({ value: t.value, label: t.label }))
const SEVERITY_OPTIONS = INCIDENT_SEVERITIES.map((s) => ({ value: s.value, label: s.label }))
const STATUS_OPTIONS = INCIDENT_STATUSES.map((s) => ({ value: s.value, label: s.label }))

interface Draft {
  incident_date: string
  incident_type: string
  severity: string
  status: string
  vehicle_id: string
  vehicle_label: string
  driver_id: string
  driver_label: string
  location: string
  description: string
  cost: string
  resolved_at: string | null
  resolution_notes: string
}

function vehicleLabel(vehicle: { economic_number: string; plate: string | null } | null): string {
  if (!vehicle) return ''
  return vehicle.plate ? `${vehicle.economic_number} · ${vehicle.plate}` : vehicle.economic_number
}

function driverLabel(driver: { first_name: string; last_name: string } | null): string {
  if (!driver) return ''
  return `${driver.first_name} ${driver.last_name}`
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function toDraft(incident?: IncidentWithRelations): Draft {
  return {
    incident_date: incident?.incident_date ?? todayIso(),
    incident_type: incident?.incident_type ?? 'other',
    severity: incident?.severity ?? 'medium',
    status: incident?.status ?? 'open',
    vehicle_id: incident?.vehicle_id ?? '',
    vehicle_label: vehicleLabel(incident?.vehicles ?? null),
    driver_id: incident?.driver_id ?? '',
    driver_label: driverLabel(incident?.drivers ?? null),
    location: incident?.location ?? '',
    description: incident?.description ?? '',
    cost: incident?.cost != null ? String(incident.cost) : '',
    resolved_at: incident?.resolved_at ?? null,
    resolution_notes: incident?.resolution_notes ?? '',
  }
}

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'nuevo'
  const navigate = useNavigate()
  const { activeOrg } = useOrg()

  const incidentQuery = useIncident(isNew ? undefined : id)
  const createMutation = useCreateIncident()
  const updateMutation = useUpdateIncident()
  const deleteMutation = useDeleteIncident()

  const [draft, setDraft] = useState<Draft>(() => toDraft())
  const [original, setOriginal] = useState<Draft>(() => toDraft())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (incidentQuery.data) {
      const next = toDraft(incidentQuery.data)
      setDraft(next)
      setOriginal(next)
    }
  }, [incidentQuery.data])

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

  function handleBack() {
    if (dirty) {
      setLeaveConfirmOpen(true)
    } else {
      navigate('/incidentes')
    }
  }

  function handleSave() {
    const nextErrors: Record<string, string> = {}
    if (!draft.incident_date) nextErrors.incident_date = 'Campo obligatorio'
    if (!draft.description.trim()) nextErrors.description = 'Campo obligatorio'
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    // Cerrar el incidente sella `resolved_at` automáticamente si no lo tenía,
    // mismo criterio que `maintenance_records` al pasar a "Completado".
    const resolvedAt = draft.status === 'resolved' ? (draft.resolved_at ?? new Date().toISOString()) : null

    const input = {
      incident_date: draft.incident_date,
      incident_type: draft.incident_type,
      severity: draft.severity,
      status: draft.status,
      vehicle_id: draft.vehicle_id || null,
      driver_id: draft.driver_id || null,
      location: draft.location || null,
      description: draft.description,
      cost: draft.cost ? Number(draft.cost) : null,
      resolved_at: resolvedAt,
      resolution_notes: draft.resolution_notes || null,
    }

    if (isNew) {
      createMutation.mutate(input, {
        onSuccess: (created) => navigate(`/incidentes/${created.id}`, { replace: true }),
      })
    } else if (id) {
      updateMutation.mutate({ id, input }, { onSuccess: () => setOriginal({ ...draft, resolved_at: resolvedAt }) })
    }
  }

  function handleDiscard() {
    if (isNew) {
      navigate('/incidentes')
    } else {
      setDraft(original)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending
  const incident = incidentQuery.data

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-surface px-4 py-3 sm:px-6">
          <button type="button" onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
            <ArrowLeft size={15} strokeWidth={2} />
            Incidentes
          </button>
          {!isNew && incident && (
            <Can permission="alerts.manage">
              <button type="button" onClick={() => setDeleteOpen(true)} className="text-sm font-medium text-red-600 hover:text-red-700">
                Eliminar
              </button>
            </Can>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto bg-surface lg:flex-row lg:overflow-hidden">
          <div className="flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:overflow-y-auto">
            {!isNew && incidentQuery.isLoading && <Skeleton className="h-64" />}
            {!isNew && incidentQuery.isError && (
              <ErrorState message="No se pudo cargar el incidente." onRetry={() => void incidentQuery.refetch()} />
            )}

            {(isNew || incident) && (
              <div className="flex max-w-4xl flex-col gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-ink">
                    {isNew ? 'Nuevo incidente' : `${TYPE_OPTIONS.find((t) => t.value === draft.incident_type)?.label ?? draft.incident_type}`}
                  </h1>
                  <p className="text-sm text-gray-500">{draft.location || 'Sin ubicación registrada'}</p>
                </div>

                <DetailSection title="Datos del incidente" description="Fecha, tipo, severidad y estado.">
                  <DetailGrid>
                    <DetailField label="Fecha" required error={errors.incident_date}>
                      <InlineField type="date" value={draft.incident_date} onChange={(v) => update('incident_date', v)} />
                    </DetailField>
                    <DetailField label="Tipo">
                      <InlineField type="buttons" value={draft.incident_type} options={TYPE_OPTIONS} onChange={(v) => update('incident_type', v)} />
                    </DetailField>

                    <DetailField label="Severidad">
                      <InlineField type="buttons" value={draft.severity} options={SEVERITY_OPTIONS} onChange={(v) => update('severity', v)} />
                    </DetailField>
                    <DetailField label="Estado">
                      <InlineField type="buttons" value={draft.status} options={STATUS_OPTIONS} onChange={(v) => update('status', v)} />
                    </DetailField>

                    <DetailField label="Ubicación">
                      <InlineField value={draft.location} onChange={(v) => update('location', v)} placeholder="Dirección o referencia..." />
                    </DetailField>
                    <DetailField label="Costo">
                      <InlineField type="number" value={draft.cost} onChange={(v) => update('cost', v)} placeholder="0.00" />
                    </DetailField>

                    <DetailField label="Descripción" full required error={errors.description}>
                      <InlineField type="textarea" value={draft.description} onChange={(v) => update('description', v)} placeholder="Qué ocurrió..." />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Vehículo y operador" description="A quién/qué involucró el incidente (opcional).">
                  <DetailGrid>
                    <DetailField label="Vehículo">
                      <RelationSelect
                        value={draft.vehicle_id || null}
                        displayLabel={draft.vehicle_label || null}
                        placeholder="Sin asignar"
                        onSearch={(query) =>
                          searchVehicles(activeOrg!.id, query).then((rows) =>
                            rows.map((r) => ({
                              id: r.id,
                              label: [r.economic_number, r.plate].filter(Boolean).join(' · ') || 'Sin identificar',
                            })),
                          )
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
                          searchDrivers(activeOrg!.id, query).then((rows) =>
                            rows.map((r) => ({ id: r.id, label: `${r.first_name} ${r.last_name}` })),
                          )
                        }
                        onSelect={(option) => {
                          update('driver_id', option?.id ?? '')
                          update('driver_label', option?.label ?? '')
                        }}
                      />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Resolución" description="Notas de cómo se resolvió (si aplica). La fecha de resolución se sella sola al marcar Resuelto.">
                  <DetailGrid>
                    <DetailField label="Resuelto el">
                      <InlineField readOnly value={draft.resolved_at ? formatDateTime(draft.resolved_at) : ''} onChange={() => {}} />
                    </DetailField>
                    <DetailField label="Notas de resolución" full>
                      <InlineField type="textarea" value={draft.resolution_notes} onChange={(v) => update('resolution_notes', v)} placeholder="Agregar…" />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>
              </div>
            )}
          </div>

          {!isNew && id && (
            <Can permission="audit.view">
              <div className="shrink-0 border-t border-gray-200 lg:w-80 lg:border-l lg:border-t-0">
                <HistoryPanel entityType="incidents" entityId={id} />
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
        onConfirm={() => navigate('/incidentes')}
        onCancel={() => setLeaveConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar incidente"
        description="¿Seguro que quieres eliminar este incidente? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => id && deleteMutation.mutate(id, { onSuccess: () => navigate('/incidentes') })}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
