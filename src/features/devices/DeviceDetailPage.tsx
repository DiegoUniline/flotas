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
import { DEVICE_STATUSES, DEVICE_TYPES, type DeviceWithRelations } from '@/features/devices/api/devicesApi'
import { useCreateDevice, useDeleteDevice, useDevice, useUpdateDevice } from '@/features/devices/hooks/useDevices'

const TYPE_OPTIONS = DEVICE_TYPES.map((t) => ({ value: t.value, label: t.label }))
const STATUS_OPTIONS = DEVICE_STATUSES.map((s) => ({ value: s.value, label: s.label }))

interface Draft {
  name: string
  device_type: string
  serial_number: string
  vehicle_id: string
  vehicle_label: string
  status: string
  install_date: string
  notes: string
  active: boolean
}

function vehicleLabel(vehicle: { economic_number: string; plate: string | null } | null): string {
  if (!vehicle) return ''
  return vehicle.plate ? `${vehicle.economic_number} · ${vehicle.plate}` : vehicle.economic_number
}

function toDraft(device?: DeviceWithRelations): Draft {
  return {
    name: device?.name ?? '',
    device_type: device?.device_type ?? 'gps_tracker',
    serial_number: device?.serial_number ?? '',
    vehicle_id: device?.vehicle_id ?? '',
    vehicle_label: vehicleLabel(device?.vehicles ?? null),
    status: device?.status ?? 'active',
    install_date: device?.install_date ?? '',
    notes: device?.notes ?? '',
    active: device?.active ?? true,
  }
}

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'nuevo'
  const navigate = useNavigate()
  const { activeOrg } = useOrg()

  const deviceQuery = useDevice(isNew ? undefined : id)
  const createMutation = useCreateDevice()
  const updateMutation = useUpdateDevice()
  const deleteMutation = useDeleteDevice()

  const [draft, setDraft] = useState<Draft>(() => toDraft())
  const [original, setOriginal] = useState<Draft>(() => toDraft())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (deviceQuery.data) {
      const next = toDraft(deviceQuery.data)
      setDraft(next)
      setOriginal(next)
    }
  }, [deviceQuery.data])

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
      navigate('/dispositivos')
    }
  }

  function handleSave() {
    if (!draft.name.trim()) {
      setErrors({ name: 'Campo obligatorio' })
      return
    }

    const input = {
      name: draft.name,
      device_type: draft.device_type,
      serial_number: draft.serial_number || null,
      vehicle_id: draft.vehicle_id || null,
      status: draft.status,
      install_date: draft.install_date || null,
      notes: draft.notes || null,
      active: draft.active,
    }

    if (isNew) {
      createMutation.mutate(input, {
        onSuccess: (created) => navigate(`/dispositivos/${created.id}`, { replace: true }),
      })
    } else if (id) {
      updateMutation.mutate({ id, input }, { onSuccess: () => setOriginal(draft) })
    }
  }

  function handleDiscard() {
    if (isNew) {
      navigate('/dispositivos')
    } else {
      setDraft(original)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending
  const device = deviceQuery.data

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <button type="button" onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
            <ArrowLeft size={15} strokeWidth={2} />
            Dispositivos
          </button>
          {!isNew && device && (
            <Can permission="devices.manage">
              <button type="button" onClick={() => setDeleteOpen(true)} className="text-sm font-medium text-red-600 hover:text-red-700">
                Eliminar
              </button>
            </Can>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {!isNew && deviceQuery.isLoading && <Skeleton className="h-64" />}
            {!isNew && deviceQuery.isError && (
              <ErrorState message="No se pudo cargar el dispositivo." onRetry={() => void deviceQuery.refetch()} />
            )}

            {(isNew || device) && (
              <div className="flex max-w-4xl flex-col gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-ink">{draft.name || (isNew ? 'Nuevo dispositivo' : 'Dispositivo')}</h1>
                  <p className="text-sm text-gray-500">{TYPE_OPTIONS.find((t) => t.value === draft.device_type)?.label ?? draft.device_type}</p>
                </div>

                <DetailSection title="Identificación" description="Nombre, tipo y número de serie del dispositivo.">
                  <DetailGrid>
                    <DetailField label="Nombre" required error={errors.name}>
                      <InlineField value={draft.name} onChange={(v) => update('name', v)} placeholder="Nombre o alias del dispositivo" />
                    </DetailField>
                    <DetailField label="Tipo">
                      <InlineField type="buttons" value={draft.device_type} options={TYPE_OPTIONS} onChange={(v) => update('device_type', v)} />
                    </DetailField>

                    <DetailField label="No. de serie">
                      <InlineField value={draft.serial_number} onChange={(v) => update('serial_number', v)} placeholder="Agregar…" />
                    </DetailField>
                    <DetailField label="Estado">
                      <InlineField type="buttons" value={draft.status} options={STATUS_OPTIONS} onChange={(v) => update('status', v)} />
                    </DetailField>

                    <DetailField label="Activo">
                      <InlineField type="checkbox" value={draft.active ? 'true' : 'false'} onChange={(v) => update('active', v === 'true')} />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Instalación" description="Vehículo donde está instalado (si aplica) y fecha de instalación.">
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
                    <DetailField label="Fecha de instalación">
                      <InlineField type="date" value={draft.install_date} onChange={(v) => update('install_date', v)} />
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
                <HistoryPanel entityType="devices" entityId={id} />
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
        onConfirm={() => navigate('/dispositivos')}
        onCancel={() => setLeaveConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar dispositivo"
        description={`¿Seguro que quieres eliminar "${draft.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => id && deleteMutation.mutate(id, { onSuccess: () => navigate('/dispositivos') })}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
