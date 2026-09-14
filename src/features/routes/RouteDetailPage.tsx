import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DetailField, DetailGrid, DetailSection } from '@/components/ui/DetailGrid'
import { InlineField } from '@/components/ui/InlineField'
import { RelationSelect } from '@/components/ui/RelationSelect'
import { SaveDiscardBar } from '@/components/ui/SaveDiscardBar'
import { HistoryPanel } from '@/components/audit/HistoryPanel'
import { Can } from '@/components/Can'
import { useOrg } from '@/context/OrgContext'
import { searchLocations } from '@/features/locations/api/locationsApi'
import { LocationQuickCreate } from '@/features/locations/components/LocationQuickCreate'
import { searchDrivers } from '@/features/drivers/api/driversApi'
import { DriverQuickCreate } from '@/features/drivers/components/DriverQuickCreate'
import { searchVehicles } from '@/features/vehicles/api/vehiclesApi'
import {
  useAddStopFromJob,
  useCreateRoutePlan,
  useDeleteRouteStop,
  useMarkStopStatus,
  usePendingJobOptions,
  useRoutePlan,
  useRouteStops,
  useUpdateRoutePlan,
} from '@/features/routes/hooks/useRoutes'
import { ROUTE_STATUSES, type RoutePlanWithRelations } from '@/features/routes/api/routePlansApi'
import { STOP_STATUSES } from '@/features/routes/api/routeStopsApi'
import { formatDate } from '@/lib/format'

const ROUTE_STATUS_LABELS = Object.fromEntries(ROUTE_STATUSES.map((s) => [s.value, s.label]))
const STOP_STATUS_LABELS = Object.fromEntries(STOP_STATUSES.map((s) => [s.value, s.label]))
const STOP_STATUS_TONE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-500',
  in_progress: 'bg-status-progress-bg text-status-progress',
  completed: 'bg-status-active-bg text-status-active',
  skipped: 'bg-status-delayed-bg text-status-delayed',
}

const NEXT_ROUTE_STATUS: Record<string, { next: string; label: string } | undefined> = {
  draft: { next: 'planned', label: 'Marcar planeada' },
  planned: { next: 'in_progress', label: 'Iniciar ruta' },
  in_progress: { next: 'completed', label: 'Completar ruta' },
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

interface Draft {
  route_number: string
  name: string
  scheduled_date: string
  location_id: string
  location_label: string
  driver_id: string
  driver_label: string
  vehicle_id: string
  vehicle_label: string
  notes: string
}

function toDraft(route?: RoutePlanWithRelations): Draft {
  return {
    route_number: route?.route_number ?? '',
    name: route?.name ?? '',
    scheduled_date: route?.scheduled_date ?? todayIso(),
    location_id: route?.location_id ?? '',
    location_label: '',
    driver_id: route?.driver_id ?? '',
    driver_label: route?.drivers ? `${route.drivers.first_name} ${route.drivers.last_name}` : '',
    vehicle_id: route?.vehicle_id ?? '',
    vehicle_label: route?.vehicles?.economic_number ?? route?.vehicles?.plate ?? '',
    notes: route?.notes ?? '',
  }
}

export function RouteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'nuevo'
  const navigate = useNavigate()
  const { activeOrg } = useOrg()

  const routeQuery = useRoutePlan(isNew ? undefined : id)
  const createMutation = useCreateRoutePlan()
  const updateMutation = useUpdateRoutePlan(isNew ? undefined : id)
  const stopsQuery = useRouteStops(isNew ? undefined : id)
  const markStopMutation = useMarkStopStatus(id ?? '')
  const deleteStopMutation = useDeleteRouteStop(id ?? '')
  const addStopMutation = useAddStopFromJob(id ?? '')
  const [pickerOpen, setPickerOpen] = useState(false)
  const pendingJobsQuery = usePendingJobOptions(routeQuery.data?.scheduled_date ?? undefined)

  const [draft, setDraft] = useState<Draft>(() => toDraft())
  const [original, setOriginal] = useState<Draft>(() => toDraft())
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)

  useEffect(() => {
    if (routeQuery.data) {
      const next = toDraft(routeQuery.data)
      setDraft(next)
      setOriginal(next)
    }
  }, [routeQuery.data])

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
      navigate('/rutas')
    }
  }

  function handleSave() {
    const input = {
      route_number: draft.route_number || null,
      name: draft.name || null,
      scheduled_date: draft.scheduled_date,
      location_id: draft.location_id || null,
      driver_id: draft.driver_id || null,
      vehicle_id: draft.vehicle_id || null,
      notes: draft.notes || null,
    }

    if (isNew) {
      createMutation.mutate(input, {
        onSuccess: (created) => navigate(`/rutas/${created.id}`, { replace: true }),
      })
    } else if (id) {
      updateMutation.mutate({ id, input }, { onSuccess: () => setOriginal(draft) })
    }
  }

  function handleDiscard() {
    if (isNew) {
      navigate('/rutas')
    } else {
      setDraft(original)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending
  const route = routeQuery.data
  const nextStatus = route ? NEXT_ROUTE_STATUS[route.status] : undefined
  const canCancel = route && !['completed', 'cancelled'].includes(route.status)

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <button type="button" onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
            <ArrowLeft size={15} strokeWidth={2} />
            Rutas
          </button>
          {!isNew && route && (
            <Can permission="routes.assign">
              <div className="flex items-center gap-3">
                {nextStatus && (
                  <Button
                    variant="secondary"
                    loading={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: route.id, input: { status: nextStatus.next } })}
                  >
                    {nextStatus.label}
                  </Button>
                )}
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => updateMutation.mutate({ id: route.id, input: { status: 'cancelled' } })}
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Cancelar ruta
                  </button>
                )}
              </div>
            </Can>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {!isNew && routeQuery.isLoading && <Skeleton className="h-64" />}
            {!isNew && routeQuery.isError && (
              <ErrorState message="No se pudo cargar la ruta." onRetry={() => void routeQuery.refetch()} />
            )}

            {(isNew || route) && (
              <div className="flex max-w-6xl flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h1 className="text-xl font-semibold text-ink">
                      {draft.name || draft.route_number || (isNew ? 'Nueva ruta' : 'Ruta')}
                    </h1>
                    <p className="text-sm text-gray-500">{formatDate(draft.scheduled_date)}</p>
                  </div>
                  {!isNew && route && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                      {ROUTE_STATUS_LABELS[route.status] ?? route.status}
                    </span>
                  )}
                </div>

                <DetailSection title="Datos de la ruta" description="Identificación, fecha y asignación.">
                  <DetailGrid>
                    <DetailField label="Nombre">
                      <InlineField value={draft.name} onChange={(v) => update('name', v)} placeholder="Ruta Norte" />
                    </DetailField>
                    <DetailField label="Número">
                      <InlineField value={draft.route_number} onChange={(v) => update('route_number', v)} placeholder="Agregar…" />
                    </DetailField>

                    <DetailField label="Fecha">
                      <InlineField type="date" value={draft.scheduled_date} onChange={(v) => update('scheduled_date', v)} />
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
                        createLabel="Operador"
                        renderCreateForm={({ initialName, onCreated, onCancel }) => (
                          <DriverQuickCreate initialName={initialName} onCreated={onCreated} onCancel={onCancel} />
                        )}
                      />
                    </DetailField>
                    <DetailField label="Vehículo">
                      <RelationSelect
                        value={draft.vehicle_id || null}
                        displayLabel={draft.vehicle_label || null}
                        placeholder="Sin asignar"
                        onSearch={(query) =>
                          searchVehicles(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.economic_number ?? r.plate ?? r.id })))
                        }
                        onSelect={(option) => {
                          update('vehicle_id', option?.id ?? '')
                          update('vehicle_label', option?.label ?? '')
                        }}
                      />
                    </DetailField>

                    <DetailField label="Notas" full>
                      <InlineField type="textarea" value={draft.notes} onChange={(v) => update('notes', v)} />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                {!isNew && id && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-ink">Paradas</h2>
                      <Can permission="routes.assign">
                        <button
                          type="button"
                          onClick={() => setPickerOpen(true)}
                          className="flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
                        >
                          <Plus size={15} strokeWidth={2} />
                          Agregar parada
                        </button>
                      </Can>
                    </div>

                    {stopsQuery.isLoading ? (
                      <Skeleton className="h-20" />
                    ) : stopsQuery.data && stopsQuery.data.length > 0 ? (
                      <ol className="flex flex-col gap-2">
                        {stopsQuery.data.map((stop, index) => (
                          <li key={stop.id} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 text-sm">
                            <div className="flex items-center gap-3">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                                {index + 1}
                              </span>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {stop.name ?? stop.jobs?.customers?.name ?? 'Parada'}
                                  {stop.jobs?.job_number && <span className="ml-1.5 text-gray-400">· {stop.jobs.job_number}</span>}
                                </p>
                                <p className="text-xs text-gray-500">{stop.address ?? 'Sin dirección'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STOP_STATUS_TONE[stop.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                {STOP_STATUS_LABELS[stop.status] ?? stop.status}
                              </span>
                              <Can permission="routes.assign">
                                {stop.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={() => markStopMutation.mutate({ id: stop.id, status: 'in_progress' })}
                                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                                  >
                                    En camino
                                  </button>
                                )}
                                {stop.status === 'in_progress' && (
                                  <button
                                    type="button"
                                    onClick={() => markStopMutation.mutate({ id: stop.id, status: 'completed' })}
                                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                                  >
                                    Completar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => deleteStopMutation.mutate(stop.id)}
                                  className="text-gray-400 hover:text-red-600"
                                  aria-label="Eliminar parada"
                                >
                                  <Trash2 size={14} strokeWidth={2} />
                                </button>
                              </Can>
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <EmptyState title="Sin paradas" description="Agrega paradas desde los pedidos pendientes de esta fecha." />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {!isNew && id && (
            <Can permission="audit.view">
              <div className="w-80 shrink-0 border-l border-gray-200">
                <HistoryPanel entityType="route_plans" entityId={id} />
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
        onConfirm={() => navigate('/rutas')}
        onCancel={() => setLeaveConfirmOpen(false)}
      />

      <Drawer open={pickerOpen} title="Agregar parada desde un pedido" onClose={() => setPickerOpen(false)}>
        {pendingJobsQuery.data && pendingJobsQuery.data.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {pendingJobsQuery.data.map((job) => (
              <li key={job.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{job.job_number ?? job.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-500">{job.customers?.name ?? 'Sin cliente'}</p>
                </div>
                <Button
                  variant="secondary"
                  loading={addStopMutation.isPending}
                  onClick={() => addStopMutation.mutate(job.id, { onSuccess: () => setPickerOpen(false) })}
                >
                  Agregar
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Sin pedidos pendientes" description="No hay pedidos pendientes para la fecha de esta ruta." />
        )}
      </Drawer>
    </>
  )
}
