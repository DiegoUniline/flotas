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
import { AttachmentUploader } from '@/components/attachments/AttachmentUploader'
import { Can } from '@/components/Can'
import { useOrg } from '@/context/OrgContext'
import { formatCurrency } from '@/lib/format'
import { searchVehicles } from '@/features/vehicles/api/vehiclesApi'
import { searchDrivers } from '@/features/drivers/api/driversApi'
import { searchFuelStations } from '@/features/fuel/api/fuelStationsApi'
import { searchFuelTypes } from '@/features/fuel/api/fuelTypesApi'
import { FuelStationQuickForm } from '@/features/fuel/components/FuelStationQuickForm'
import { FuelTypeQuickForm } from '@/features/fuel/components/FuelTypeQuickForm'
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
  fuel_station_id: string
  fuel_station_label: string
  fuel_type_id: string
  fuel_type_label: string
  full_tank: boolean
  has_invoice: boolean
  invoiced: boolean
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
    fuel_station_id: log?.fuel_station_id ?? '',
    fuel_station_label: log?.fuel_stations?.name ?? '',
    fuel_type_id: log?.fuel_type_id ?? '',
    fuel_type_label: log?.fuel_types?.name ?? '',
    full_tank: log?.full_tank ?? true,
    has_invoice: log?.has_invoice ?? false,
    invoiced: log?.invoiced ?? false,
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
      fuel_station_id: draft.fuel_station_id || null,
      fuel_type_id: draft.fuel_type_id || null,
      full_tank: draft.full_tank,
      has_invoice: draft.has_invoice,
      invoiced: draft.has_invoice && draft.invoiced,
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
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
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

        <div className="flex flex-1 flex-col overflow-y-auto bg-white lg:flex-row lg:overflow-hidden">
          <div className="flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:overflow-y-auto">
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
                      <RelationSelect
                        value={draft.fuel_station_id || null}
                        displayLabel={draft.fuel_station_label || null}
                        placeholder="Selecciona o crea una…"
                        onSearch={(query) =>
                          searchFuelStations(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.name })))
                        }
                        onSelect={(option) => {
                          update('fuel_station_id', option?.id ?? '')
                          update('fuel_station_label', option?.label ?? '')
                        }}
                        createLabel="Gasolinera"
                        renderCreateForm={({ initialName, onCreated, onCancel }) => (
                          <FuelStationQuickForm initialName={initialName} onCreated={onCreated} onCancel={onCancel} />
                        )}
                      />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Carga" description="Litros, costo, tipo de combustible y kilometraje al momento de la carga.">
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
                      <RelationSelect
                        value={draft.fuel_type_id || null}
                        displayLabel={draft.fuel_type_label || null}
                        placeholder="Selecciona o crea uno…"
                        onSearch={(query) => searchFuelTypes(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.name })))}
                        onSelect={(option) => {
                          update('fuel_type_id', option?.id ?? '')
                          update('fuel_type_label', option?.label ?? '')
                        }}
                        createLabel="Tipo de combustible"
                        renderCreateForm={({ initialName, onCreated, onCancel }) => (
                          <FuelTypeQuickForm initialName={initialName} onCreated={onCreated} onCancel={onCancel} />
                        )}
                      />
                    </DetailField>

                    <DetailField label="Tanque lleno">
                      <InlineField type="checkbox" value={draft.full_tank ? 'true' : 'false'} onChange={(v) => update('full_tank', v === 'true')} />
                    </DetailField>

                    <DetailField label="Notas" full>
                      <InlineField type="textarea" value={draft.notes} onChange={(v) => update('notes', v)} />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Factura" description="Si la carga incluye factura fiscal (CFDI) y si ya se obtuvo.">
                  <DetailGrid>
                    <DetailField label="Lleva factura">
                      <InlineField
                        type="checkbox"
                        value={draft.has_invoice ? 'true' : 'false'}
                        onChange={(v) => {
                          const hasInvoice = v === 'true'
                          update('has_invoice', hasInvoice)
                          if (!hasInvoice) update('invoiced', false)
                        }}
                      />
                    </DetailField>
                    {draft.has_invoice && (
                      <DetailField label="Ya facturado">
                        <InlineField
                          type="checkbox"
                          value={draft.invoiced ? 'true' : 'false'}
                          onChange={(v) => update('invoiced', v === 'true')}
                        />
                      </DetailField>
                    )}
                  </DetailGrid>
                </DetailSection>

                {!isNew && id && (
                  <DetailSection title="Evidencia fotográfica" description="Foto del ticket de la gasolinera y del odómetro al momento de la carga.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <AttachmentUploader entityType="fuel_log_receipt" entityId={id} label="Foto del ticket" />
                      <AttachmentUploader entityType="fuel_log_odometer" entityId={id} label="Foto del odómetro" />
                    </div>
                  </DetailSection>
                )}
              </div>
            )}
          </div>

          {!isNew && id && (
            <Can permission="audit.view">
              <div className="shrink-0 border-t border-gray-200 lg:w-80 lg:border-l lg:border-t-0">
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
