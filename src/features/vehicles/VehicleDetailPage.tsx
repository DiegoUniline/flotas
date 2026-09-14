import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DetailField, DetailGrid, DetailSection } from '@/components/ui/DetailGrid'
import { InlineField } from '@/components/ui/InlineField'
import { SaveDiscardBar } from '@/components/ui/SaveDiscardBar'
import { Tabs } from '@/components/ui/Tabs'
import { RelationSelect } from '@/components/ui/RelationSelect'
import { HistoryPanel } from '@/components/audit/HistoryPanel'
import { Can } from '@/components/Can'
import { useOrg } from '@/context/OrgContext'
import { searchLocations } from '@/features/locations/api/locationsApi'
import { LocationQuickCreate } from '@/features/locations/components/LocationQuickCreate'
import {
  searchVehicleGroups,
  searchVehicleTypes,
  VEHICLE_STATUSES,
  type VehicleWithRelations,
} from '@/features/vehicles/api/vehiclesApi'
import {
  useCreateVehicle,
  useDeleteVehicle,
  useUpdateVehicle,
  useVehicle,
} from '@/features/vehicles/hooks/useVehicles'
import { useVehicleDocuments } from '@/features/vehicles/hooks/useVehicleDetail'
import { VehicleTypeQuickForm } from './components/VehicleTypeQuickForm'
import { VehicleGroupQuickForm } from './components/VehicleGroupQuickForm'
import { VehicleAssignmentField } from './components/VehicleAssignmentField'
import { VehicleDocumentsTab } from './components/VehicleDocumentsTab'
import { VehicleAssignmentHistoryTab } from './components/VehicleAssignmentHistoryTab'

const STATUS_OPTIONS = VEHICLE_STATUSES.map((s) => ({ value: s.value, label: s.label }))

interface Draft {
  economic_number: string
  plate: string
  vin: string
  brand: string
  model: string
  year: string
  status: string
  current_odometer: string
  odometer_unit: string
  fuel_type: string
  notes: string
  active: boolean
  vehicle_type_id: string
  vehicle_type_label: string
  vehicle_group_id: string
  vehicle_group_label: string
  location_id: string
  location_label: string
}

function toDraft(vehicle?: VehicleWithRelations): Draft {
  return {
    economic_number: vehicle?.economic_number ?? '',
    plate: vehicle?.plate ?? '',
    vin: vehicle?.vin ?? '',
    brand: vehicle?.brand ?? '',
    model: vehicle?.model ?? '',
    year: vehicle?.year != null ? String(vehicle.year) : '',
    status: vehicle?.status ?? 'available',
    current_odometer: vehicle?.current_odometer != null ? String(vehicle.current_odometer) : '',
    odometer_unit: vehicle?.odometer_unit ?? 'km',
    fuel_type: vehicle?.fuel_type ?? '',
    notes: vehicle?.notes ?? '',
    active: vehicle?.active ?? true,
    vehicle_type_id: vehicle?.vehicle_type_id ?? '',
    vehicle_type_label: vehicle?.vehicle_types?.name ?? '',
    vehicle_group_id: vehicle?.vehicle_group_id ?? '',
    vehicle_group_label: vehicle?.vehicle_groups?.name ?? '',
    location_id: vehicle?.location_id ?? '',
    location_label: vehicle?.locations?.name ?? '',
  }
}

function toNullableInt(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}

function toNullableNumber(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'nuevo'
  const navigate = useNavigate()
  const { activeOrg } = useOrg()

  const vehicleQuery = useVehicle(isNew ? undefined : id)
  const createMutation = useCreateVehicle()
  const updateMutation = useUpdateVehicle()
  const deleteMutation = useDeleteVehicle()
  const documentsQuery = useVehicleDocuments(isNew ? undefined : id)

  const [draft, setDraft] = useState<Draft>(() => toDraft())
  const [original, setOriginal] = useState<Draft>(() => toDraft())
  const [tab, setTab] = useState('documentos')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)

  useEffect(() => {
    if (vehicleQuery.data) {
      const next = toDraft(vehicleQuery.data)
      setDraft(next)
      setOriginal(next)
    }
  }, [vehicleQuery.data])

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
  }

  function handleBack() {
    if (dirty) {
      setLeaveConfirmOpen(true)
    } else {
      navigate('/vehiculos')
    }
  }

  function handleSave() {
    const input = {
      economic_number: draft.economic_number || null,
      plate: draft.plate || null,
      vin: draft.vin || null,
      brand: draft.brand || null,
      model: draft.model || null,
      year: toNullableInt(draft.year),
      status: draft.status,
      current_odometer: toNullableNumber(draft.current_odometer),
      odometer_unit: draft.odometer_unit,
      fuel_type: draft.fuel_type || null,
      notes: draft.notes || null,
      active: draft.active,
      vehicle_type_id: draft.vehicle_type_id,
      vehicle_group_id: draft.vehicle_group_id || null,
      location_id: draft.location_id || null,
    }

    if (isNew) {
      createMutation.mutate(input, {
        onSuccess: (created) => navigate(`/vehiculos/${created.id}`, { replace: true }),
      })
    } else if (id) {
      updateMutation.mutate({ id, input }, { onSuccess: () => setOriginal(draft) })
    }
  }

  function handleDiscard() {
    if (isNew) {
      navigate('/vehiculos')
    } else {
      setDraft(original)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending
  const vehicle = vehicleQuery.data

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <button type="button" onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
            <ArrowLeft size={15} strokeWidth={2} />
            Vehículos
          </button>
          {!isNew && vehicle && (
            <Can permission="vehicles.delete">
              <button type="button" onClick={() => setDeleteOpen(true)} className="text-sm font-medium text-red-600 hover:text-red-700">
                Eliminar
              </button>
            </Can>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {!isNew && vehicleQuery.isLoading && <Skeleton className="h-64" />}
            {!isNew && vehicleQuery.isError && (
              <ErrorState message="No se pudo cargar el vehículo." onRetry={() => void vehicleQuery.refetch()} />
            )}

            {(isNew || vehicle) && (
              <div className="flex max-w-6xl flex-col gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-ink">
                    {draft.economic_number || (isNew ? 'Nuevo vehículo' : 'Vehículo')}
                  </h1>
                  <p className="text-sm text-gray-500">Placas: {draft.plate || 'sin registrar'}</p>
                </div>

                <DetailSection title="Identificación" description="Datos de registro del vehículo.">
                  <DetailGrid>
                    <DetailField label="Número económico">
                      <InlineField value={draft.economic_number} onChange={(v) => update('economic_number', v)} placeholder="Agregar…" />
                    </DetailField>
                    <DetailField label="Tipo">
                      <RelationSelect
                        value={draft.vehicle_type_id || null}
                        displayLabel={draft.vehicle_type_label || null}
                        placeholder="Selecciona un tipo"
                        onSearch={(query) =>
                          searchVehicleTypes(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.name })))
                        }
                        onSelect={(option) => {
                          update('vehicle_type_id', option?.id ?? '')
                          update('vehicle_type_label', option?.label ?? '')
                        }}
                        createLabel="Tipo de vehículo"
                        renderCreateForm={({ initialName, onCreated, onCancel }) => (
                          <VehicleTypeQuickForm initialName={initialName} onCreated={onCreated} onCancel={onCancel} />
                        )}
                      />
                    </DetailField>

                    <DetailField label="Placas">
                      <InlineField value={draft.plate} onChange={(v) => update('plate', v)} />
                    </DetailField>
                    <DetailField label="VIN">
                      <InlineField value={draft.vin} onChange={(v) => update('vin', v)} />
                    </DetailField>

                    <DetailField label="Marca">
                      <InlineField value={draft.brand} onChange={(v) => update('brand', v)} />
                    </DetailField>
                    <DetailField label="Modelo">
                      <InlineField value={draft.model} onChange={(v) => update('model', v)} />
                    </DetailField>

                    <DetailField label="Año">
                      <InlineField type="number" value={draft.year} onChange={(v) => update('year', v)} />
                    </DetailField>
                    <DetailField label="Grupo">
                      <RelationSelect
                        value={draft.vehicle_group_id || null}
                        displayLabel={draft.vehicle_group_label || null}
                        placeholder="Sin grupo"
                        onSearch={(query) =>
                          searchVehicleGroups(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.name })))
                        }
                        onSelect={(option) => {
                          update('vehicle_group_id', option?.id ?? '')
                          update('vehicle_group_label', option?.label ?? '')
                        }}
                        createLabel="Grupo de vehículos"
                        renderCreateForm={({ initialName, onCreated, onCancel }) => (
                          <VehicleGroupQuickForm initialName={initialName} onCreated={onCreated} onCancel={onCancel} />
                        )}
                      />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Estado y asignación" description="Dónde está el vehículo y quién lo trae.">
                  <DetailGrid>
                    <DetailField label="Estado">
                      <InlineField type="select" value={draft.status} options={STATUS_OPTIONS} onChange={(v) => update('status', v)} />
                    </DetailField>
                    <DetailField label="Sucursal base">
                      <RelationSelect
                        value={draft.location_id || null}
                        displayLabel={draft.location_label || null}
                        placeholder="Sin asignar"
                        onSearch={(query) =>
                          searchLocations(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.name })))
                        }
                        onSelect={(option) => {
                          update('location_id', option?.id ?? '')
                          update('location_label', option?.label ?? '')
                        }}
                        createLabel="Sucursal"
                        renderCreateForm={({ initialName, onCreated, onCancel }) => (
                          <LocationQuickCreate initialName={initialName} onCreated={onCreated} onCancel={onCancel} />
                        )}
                      />
                    </DetailField>

                    <DetailField label="Operador asignado">
                      {isNew ? (
                        <div className="px-1.5 py-1 text-sm text-gray-400">Disponible al guardar</div>
                      ) : (
                        <VehicleAssignmentField
                          vehicleId={id!}
                          driverId={vehicle?.assigned_driver_id ?? null}
                          driverLabel={vehicle?.drivers ? `${vehicle.drivers.first_name} ${vehicle.drivers.last_name}` : null}
                        />
                      )}
                    </DetailField>
                    <DetailField label="Activo">
                      <InlineField type="checkbox" value={draft.active ? 'true' : 'false'} onChange={(v) => update('active', v === 'true')} />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Operación" description="Combustible y odómetro.">
                  <DetailGrid>
                    <DetailField label="Combustible">
                      <InlineField value={draft.fuel_type} onChange={(v) => update('fuel_type', v)} placeholder="Diésel, gasolina..." />
                    </DetailField>
                    <DetailField label="Odómetro">
                      <InlineField type="number" value={draft.current_odometer} onChange={(v) => update('current_odometer', v)} />
                    </DetailField>

                    <DetailField label="Unidad">
                      <InlineField
                        type="select"
                        value={draft.odometer_unit}
                        options={[
                          { value: 'km', label: 'km' },
                          { value: 'mi', label: 'mi' },
                        ]}
                        onChange={(v) => update('odometer_unit', v)}
                      />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Notas">
                  <DetailGrid>
                    <DetailField label="Notas" full>
                      <InlineField type="textarea" value={draft.notes} onChange={(v) => update('notes', v)} />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                {!isNew && id && (
                  <div>
                    <Tabs
                      items={[
                        { key: 'documentos', label: 'Documentos', count: documentsQuery.data?.length },
                        { key: 'historial', label: 'Historial de asignación' },
                      ]}
                      active={tab}
                      onChange={setTab}
                    />
                    {tab === 'documentos' && <VehicleDocumentsTab vehicleId={id} />}
                    {tab === 'historial' && <VehicleAssignmentHistoryTab vehicleId={id} />}
                  </div>
                )}
              </div>
            )}
          </div>

          {!isNew && id && (
            <Can permission="audit.view">
              <div className="w-80 shrink-0 border-l border-gray-200">
                <HistoryPanel entityType="vehicles" entityId={id} />
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
        onConfirm={() => navigate('/vehiculos')}
        onCancel={() => setLeaveConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar vehículo"
        description={`¿Seguro que quieres eliminar "${draft.economic_number || draft.plate}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => id && deleteMutation.mutate(id, { onSuccess: () => navigate('/vehiculos') })}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
