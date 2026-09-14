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
import { formatCurrency } from '@/lib/format'
import { searchVehicles } from '@/features/vehicles/api/vehiclesApi'
import { searchDrivers } from '@/features/drivers/api/driversApi'
import type { FuelLogWithRelations } from '@/features/fuel/api/fuelLogsApi'
import { useCreateFuelLog, useDeleteFuelLog, useFuelLog, useUpdateFuelLog } from '@/features/fuel/hooks/useFuelLogs'

interface Draft {
  vehicle_id: string
  vehicle_label: string
  driver_id: string
  driver_label: string
  logged_at: string
  liters: string
  total_cost: string
  odometer: string
  station: string
  fuel_type: string
  full_tank: boolean
  notes: string
}

function toLocalDateTimeInput(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toDraft(log?: FuelLogWithRelations): Draft {
  return {
    vehicle_id: log?.vehicle_id ?? '',
    vehicle_label: log?.vehicles ? (log.vehicles.plate ? `${log.vehicles.economic_number} · ${log.vehicles.plate}` : log.vehicles.economic_number) : '',
    driver_id: log?.driver_id ?? '',
    driver_label: log?.drivers ? `${log.drivers.first_name} ${log.drivers.last_name}` : '',
    logged_at: log ? toLocalDateTimeInput(log.logged_at) : toLocalDateTimeInput(new Date().toISOString()),
    liters: log ? String(log.liters) : '',
    total_cost: log ? String(log.total_cost) : '',
    odometer: log?.odometer != null ? String(log.odometer) : '',
    station: log?.station ?? '',
    fuel_type: log?.fuel_type ?? '',
    full_tank: log?.full_tank ?? true,
    notes: log?.notes ?? '',
  }
}

export function FuelLogDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'nuevo'
  const navigate = useNavigate()
  const { activeOrg } = useOrg()

  const logQuery = useFuelLog(isNew ? undefined : id)
  const createMutation = useCreateFuelLog()
  const updateMutation = useUpdateFuelLog()
  const deleteMutation = useDeleteFuelLog()

  const [draft, setDraft] = useState<Draft>(() => toDraft())
  const [original, setOriginal] = useState<Draft>(() => toDraft())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (logQuery.data) {
      const next = toDraft(logQuery.data)
      setDraft(next)
      setOriginal(next)
    }
  }, [logQuery.data])

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
      navigate('/combustible')
    }
  }

  function handleSave() {
    const nextErrors: Record<string, string> = {}
    if (!draft.vehicle_id) nextErrors.vehicle_id = 'Campo obligatorio'
    if (!draft.liters.trim() || Number(draft.liters) <= 0) nextErrors.liters = 'Ingresa los litros cargados'
    if (!draft.total_cost.trim() || Number(draft.total_cost) < 0) nextErrors.total_cost = 'Ingresa el costo total'
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const input = {
      vehicle_id: draft.vehicle_id,
      driver_id: draft.driver_id || null,
      logged_at: draft.logged_at ? new Date(draft.logged_at).toISOString() : new Date().toISOString(),
      liters: Number(draft.liters),
      total_cost: Number(draft.total_cost),
      odometer: draft.odometer.trim() === '' ? null : Number(draft.odometer),
      station: draft.station || null,
      fuel_type: draft.fuel_type || null,
      full_tank: draft.full_tank,
      notes: draft.notes || null,
    }

    if (isNew) {
      createMutation.mutate(input, {
        onSuccess: (created) => navigate(`/combustible/${created.id}`, { replace: true }),
      })
    } else if (id) {
      updateMutation.mutate({ id, input }, { onSuccess: () => setOriginal(draft) })
    }
  }

  function handleDiscard() {
    if (isNew) {
      navigate('/combustible')
    } else {
      setDraft(original)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending
  const log = logQuery.data
  const unitCost = Number(draft.liters) > 0 && draft.total_cost.trim() !== '' ? Number(draft.total_cost) / Number(draft.liters) : null

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <button type="button" onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
            <ArrowLeft size={15} strokeWidth={2} />
            Combustible
          </button>
          {!isNew && log && (
            <Can permission="fuel.manage">
              <button type="button" onClick={() => setDeleteOpen(true)} className="text-sm font-medium text-red-600 hover:text-red-700">
                Eliminar
              </button>
            </Can>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {!isNew && logQuery.isLoading && <Skeleton className="h-64" />}
            {!isNew && logQuery.isError && (
              <ErrorState message="No se pudo cargar la carga de combustible." onRetry={() => void logQuery.refetch()} />
            )}

            {(isNew || log) && (
              <div className="flex max-w-4xl flex-col gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-ink">{draft.vehicle_label || (isNew ? 'Nueva carga de combustible' : 'Carga de combustible')}</h1>
                  <p className="text-sm text-gray-500">{unitCost != null ? `${formatCurrency(unitCost)} por litro` : 'Captura litros y costo total'}</p>
                </div>

                <DetailSection title="Vehículo y operador" description="Unidad que cargó combustible y quién la operaba.">
                  <DetailGrid>
                    <DetailField label="Vehículo" required error={errors.vehicle_id}>
                      <RelationSelect
                        value={draft.vehicle_id || null}
                        displayLabel={draft.vehicle_label || null}
                        placeholder="Selecciona un vehículo"
                        onSearch={(query) =>
                          searchVehicles(activeOrg!.id, query).then((rows) =>
                            rows.map((r) => ({ id: r.id, label: [r.economic_number, r.plate].filter(Boolean).join(' · ') || 'Sin identificar' })),
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
                          searchDrivers(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: `${r.first_name} ${r.last_name}` })))
                        }
                        onSelect={(option) => {
                          update('driver_id', option?.id ?? '')
                          update('driver_label', option?.label ?? '')
                        }}
                      />
                    </DetailField>

                    <DetailField label="Fecha y hora">
                      <input
                        type="datetime-local"
                        value={draft.logged_at}
                        onChange={(e) => update('logged_at', e.target.value)}
                        className="w-full border-0 border-b-2 border-transparent bg-transparent px-1.5 py-1 text-sm text-gray-900 transition-colors hover:border-gray-200 focus:border-accent-500 focus:outline-none"
                      />
                    </DetailField>
                    <DetailField label="Gasolinera">
                      <InlineField value={draft.station} onChange={(v) => update('station', v)} placeholder="Agregar…" />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Carga" description="Litros, costo y kilometraje al momento de la carga.">
                  <DetailGrid>
                    <DetailField label="Litros" required error={errors.liters}>
                      <InlineField type="number" value={draft.liters} onChange={(v) => update('liters', v)} placeholder="0" />
                    </DetailField>
                    <DetailField label="Costo total" required error={errors.total_cost}>
                      <InlineField type="number" value={draft.total_cost} onChange={(v) => update('total_cost', v)} placeholder="0.00" />
                    </DetailField>

                    <DetailField label="Odómetro">
                      <InlineField type="number" value={draft.odometer} onChange={(v) => update('odometer', v)} placeholder="Agregar…" />
                    </DetailField>
                    <DetailField label="Combustible">
                      <InlineField value={draft.fuel_type} onChange={(v) => update('fuel_type', v)} placeholder="Diésel, gasolina…" />
                    </DetailField>

                    <DetailField label="Tanque lleno">
                      <InlineField type="checkbox" value={draft.full_tank ? 'true' : 'false'} onChange={(v) => update('full_tank', v === 'true')} />
                    </DetailField>

                    <DetailField label="Notas" full>
                      <InlineField type="textarea" value={draft.notes} onChange={(v) => update('notes', v)} />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>
              </div>
            )}
          </div>

          {!isNew && id && (
            <Can permission="audit.view">
              <div className="w-80 shrink-0 border-l border-gray-200">
                <HistoryPanel entityType="fuel_logs" entityId={id} />
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
        onConfirm={() => navigate('/combustible')}
        onCancel={() => setLeaveConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar carga de combustible"
        description="¿Seguro que quieres eliminar este registro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => id && deleteMutation.mutate(id, { onSuccess: () => navigate('/combustible') })}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
