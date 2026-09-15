import { useEffect, useState } from 'react'
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
import { GpsCaptureField } from '@/components/ui/GpsCaptureField'
import { Can } from '@/components/Can'
import { useOrg } from '@/context/OrgContext'
import { searchCustomers } from '@/features/customers/api/customersApi'
import { searchCustomerLocations } from '@/features/customers/api/customerLocationsApi'
import { CustomerQuickCreate } from '@/features/customers/components/CustomerQuickCreate'
import { CustomerLocationQuickCreate } from '@/features/customers/components/CustomerLocationQuickCreate'
import { searchLocations } from '@/features/locations/api/locationsApi'
import { searchDrivers } from '@/features/drivers/api/driversApi'
import { searchVehicles } from '@/features/vehicles/api/vehiclesApi'
import { JOB_PRIORITIES, JOB_STATUSES, JOB_TYPES, ORIGIN_TYPES, type JobWithRelations } from '@/features/jobs/api/jobsApi'
import { useDeleteJob, useJob, useUpdateJob } from '@/features/jobs/hooks/useJobs'
import { formatCurrency } from '@/lib/format'
import { useJobPackages } from '@/features/jobs/hooks/useJobDetail'
import { JobPackagesTab } from './components/JobPackagesTab'

const TYPE_OPTIONS = JOB_TYPES.map((t) => ({ value: t.value, label: t.label }))
const STATUS_OPTIONS = JOB_STATUSES.map((s) => ({ value: s.value, label: s.label }))
const PRIORITY_OPTIONS = JOB_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))
const ORIGIN_TYPE_OPTIONS = ORIGIN_TYPES.map((o) => ({ value: o.value, label: o.label }))

interface Draft {
  job_number: string
  job_type: string
  status: string
  priority: string
  customer_id: string
  customer_label: string
  scheduled_date: string
  time_window_start: string
  time_window_end: string
  sender_name: string
  sender_phone: string
  origin_type: string
  origin_customer_location_id: string
  origin_customer_location_label: string
  origin_branch_location_id: string
  origin_branch_location_label: string
  receiver_name: string
  receiver_phone: string
  customer_location_id: string
  customer_location_label: string
  assigned_driver_id: string
  assigned_driver_label: string
  assigned_vehicle_id: string
  assigned_vehicle_label: string
  estimated_service_minutes: string
  content_description: string
  declared_value: string
  cod_amount: string
  amount: string
  received_by_name: string
  received_at: string | null
  instructions: string
  pickup_latitude: number | null
  pickup_longitude: number | null
  pickup_captured_at: string | null
  delivery_latitude: number | null
  delivery_longitude: number | null
  delivery_captured_at: string | null
  has_insurance: boolean
  insurance_percentage: string
}

function toDraft(job?: JobWithRelations): Draft {
  return {
    job_number: job?.job_number ?? '',
    job_type: job?.job_type ?? 'delivery',
    status: job?.status ?? 'pending',
    priority: job?.priority ?? 'normal',
    customer_id: job?.customer_id ?? '',
    customer_label: job?.customers?.name ?? '',
    scheduled_date: job?.scheduled_date ?? '',
    time_window_start: job?.time_window_start ?? '',
    time_window_end: job?.time_window_end ?? '',
    sender_name: job?.sender_name ?? '',
    sender_phone: job?.sender_phone ?? '',
    origin_type: job?.origin_type ?? 'pickup',
    origin_customer_location_id: job?.origin_customer_location_id ?? '',
    origin_customer_location_label: job?.origin_customer_locations?.name ?? '',
    origin_branch_location_id: job?.origin_branch_location_id ?? '',
    origin_branch_location_label: job?.origin_branch_locations?.name ?? '',
    receiver_name: job?.receiver_name ?? '',
    receiver_phone: job?.receiver_phone ?? '',
    customer_location_id: job?.customer_location_id ?? '',
    customer_location_label: job?.customer_locations?.name ?? '',
    assigned_driver_id: job?.assigned_driver_id ?? '',
    assigned_driver_label: job?.drivers ? `${job.drivers.first_name} ${job.drivers.last_name}` : '',
    assigned_vehicle_id: job?.assigned_vehicle_id ?? '',
    assigned_vehicle_label: job?.vehicles ? (job.vehicles.economic_number ?? job.vehicles.plate ?? '') : '',
    estimated_service_minutes: job?.estimated_service_minutes != null ? String(job.estimated_service_minutes) : '',
    content_description: job?.content_description ?? '',
    declared_value: job?.declared_value != null ? String(job.declared_value) : '',
    cod_amount: job?.cod_amount != null ? String(job.cod_amount) : '',
    amount: job?.amount != null ? String(job.amount) : '',
    received_by_name: job?.received_by_name ?? '',
    received_at: job?.received_at ?? null,
    instructions: job?.instructions ?? '',
    pickup_latitude: job?.pickup_latitude ?? null,
    pickup_longitude: job?.pickup_longitude ?? null,
    pickup_captured_at: job?.pickup_captured_at ?? null,
    delivery_latitude: job?.delivery_latitude ?? null,
    delivery_longitude: job?.delivery_longitude ?? null,
    delivery_captured_at: job?.delivery_captured_at ?? null,
    has_insurance: job?.has_insurance ?? false,
    insurance_percentage: job?.insurance_percentage != null ? String(job.insurance_percentage) : '',
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

interface JobDetailContentProps {
  id: string
  /** Se llama al pedir "volver"/cerrar — ya sea por el botón de regreso o
   * tras confirmar salir con cambios sin guardar. Quien la usa decide qué
   * significa "volver": navegar a `/pedidos` (página completa) o cerrar un
   * `Modal` (uso embebido, p. ej. desde el Centro de control). */
  onBack: () => void
  /** Texto del botón de regreso — "Pedidos" en la página completa,
   * "Cerrar" quando está embebido dentro de un Modal. */
  backLabel?: string
  /** Oculta el encabezado interno (botón de regreso/eliminar) cuando el
   * contenedor que lo usa (p. ej. `Modal`) ya da su propio cierre. */
  hideHeader?: boolean
}

/** Ficha completa de un pedido ya existente — cliente, recolección,
 * entrega, paquete/cobro, paquetes y el historial de auditoría. Extraído
 * de `JobDetailPage` para poder reutilizarse tanto como página completa
 * (`/pedidos/:id`) como embebido dentro de un `Modal` sin navegar a otra
 * vista (pedido explícito del usuario: "ver pedido completo" no debe
 * sacarte del Centro de control). No incluye el wizard de creación —
 * eso sigue siendo exclusivo de `JobDetailPage` para pedidos nuevos. */
export function JobDetailContent({ id, onBack, backLabel = 'Pedidos', hideHeader = false }: JobDetailContentProps) {
  const { activeOrg } = useOrg()
  const jobQuery = useJob(id)
  const updateMutation = useUpdateJob()
  const deleteMutation = useDeleteJob()
  const packagesQuery = useJobPackages(id)

  const [draft, setDraft] = useState<Draft>(() => toDraft())
  const [original, setOriginal] = useState<Draft>(() => toDraft())
  const [tab, setTab] = useState('paquetes')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (jobQuery.data) {
      const next = toDraft(jobQuery.data)
      setDraft(next)
      setOriginal(next)
    }
  }, [jobQuery.data])

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

  function validateAll(): boolean {
    const nextErrors: Record<string, string> = {}
    if (!draft.customer_id) nextErrors.customer_id = 'Campo obligatorio'
    if (draft.origin_type === 'branch' && !draft.origin_branch_location_id) nextErrors.origin_branch_location_id = 'Campo obligatorio'
    if (draft.origin_type === 'pickup' && !draft.origin_customer_location_id) nextErrors.origin_customer_location_id = 'Campo obligatorio'
    if (!draft.receiver_name.trim()) nextErrors.receiver_name = 'Campo obligatorio'
    if (!draft.customer_location_id) nextErrors.customer_location_id = 'Campo obligatorio'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleBack() {
    if (dirty) {
      setLeaveConfirmOpen(true)
    } else {
      onBack()
    }
  }

  function handleSave() {
    if (!validateAll()) return

    const receivedAt =
      draft.status === 'delivered' && original.status !== 'delivered' && !draft.received_at
        ? new Date().toISOString()
        : draft.received_at

    const input = {
      // job_number NO se manda: lo genera el trigger set_job_number() en el
      // insert (consecutivo por organización) y nunca se debe reescribir.
      job_type: draft.job_type,
      status: draft.status,
      priority: draft.priority,
      customer_id: draft.customer_id || null,
      scheduled_date: draft.scheduled_date || null,
      time_window_start: draft.time_window_start || null,
      time_window_end: draft.time_window_end || null,
      sender_name: draft.sender_name || null,
      sender_phone: draft.sender_phone || null,
      origin_type: draft.origin_type,
      origin_customer_location_id: draft.origin_type === 'pickup' ? draft.origin_customer_location_id || null : null,
      origin_branch_location_id: draft.origin_type === 'branch' ? draft.origin_branch_location_id || null : null,
      receiver_name: draft.receiver_name || null,
      receiver_phone: draft.receiver_phone || null,
      customer_location_id: draft.customer_location_id || null,
      assigned_driver_id: draft.assigned_driver_id || null,
      assigned_vehicle_id: draft.assigned_vehicle_id || null,
      estimated_service_minutes: toNullableInt(draft.estimated_service_minutes),
      content_description: draft.content_description || null,
      declared_value: toNullableNumber(draft.declared_value),
      cod_amount: toNullableNumber(draft.cod_amount),
      amount: toNullableNumber(draft.amount),
      received_by_name: draft.received_by_name || null,
      received_at: receivedAt,
      instructions: draft.instructions || null,
      pickup_latitude: draft.pickup_latitude,
      pickup_longitude: draft.pickup_longitude,
      pickup_captured_at: draft.pickup_captured_at,
      delivery_latitude: draft.delivery_latitude,
      delivery_longitude: draft.delivery_longitude,
      delivery_captured_at: draft.delivery_captured_at,
      has_insurance: draft.has_insurance,
      insurance_percentage: draft.has_insurance ? toNullableNumber(draft.insurance_percentage) : null,
    }

    updateMutation.mutate({ id, input }, { onSuccess: () => setOriginal({ ...draft, received_at: receivedAt }) })
  }

  function handleDiscard() {
    setDraft(original)
  }

  const saving = updateMutation.isPending
  const job = jobQuery.data

  const sectionDatos = (
    <DetailSection title="Datos del pedido" description="Identificación, cliente y programación.">
      <DetailGrid>
        <DetailField label="Número de pedido">
          <p className="px-1.5 py-1 text-sm text-gray-500">{draft.job_number || '—'}</p>
        </DetailField>
        <DetailField label="Tipo">
          <InlineField type="buttons" value={draft.job_type} options={TYPE_OPTIONS} onChange={(v) => update('job_type', v)} />
        </DetailField>

        <DetailField label="Cliente" required error={errors.customer_id}>
          <RelationSelect
            value={draft.customer_id || null}
            displayLabel={draft.customer_label || null}
            placeholder="Selecciona un cliente"
            onSearch={(query) => searchCustomers(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.name })))}
            onSelect={(option) => {
              update('customer_id', option?.id ?? '')
              update('customer_label', option?.label ?? '')
              update('customer_location_id', '')
              update('customer_location_label', '')
              update('origin_customer_location_id', '')
              update('origin_customer_location_label', '')
            }}
            createLabel="Cliente"
            renderCreateForm={({ initialName, onCreated, onCancel }) => (
              <CustomerQuickCreate initialName={initialName} onCreated={onCreated} onCancel={onCancel} />
            )}
          />
        </DetailField>
        <DetailField label="Estado">
          <InlineField type="select" value={draft.status} options={STATUS_OPTIONS} onChange={(v) => update('status', v)} />
        </DetailField>

        <DetailField label="Prioridad">
          <InlineField type="buttons" value={draft.priority} options={PRIORITY_OPTIONS} onChange={(v) => update('priority', v)} />
        </DetailField>
        <DetailField label="F. Programada">
          <InlineField type="date" value={draft.scheduled_date} onChange={(v) => update('scheduled_date', v)} />
        </DetailField>

        <DetailField label="Ventana desde">
          <InlineField type="time" value={draft.time_window_start} onChange={(v) => update('time_window_start', v)} />
        </DetailField>
        <DetailField label="Ventana hasta">
          <InlineField type="time" value={draft.time_window_end} onChange={(v) => update('time_window_end', v)} />
        </DetailField>
      </DetailGrid>
    </DetailSection>
  )

  const sectionOrigen = (
    <DetailSection title="Remitente y recolección" description="Quién envía y de dónde se recoge el pedido.">
      <DetailGrid>
        <DetailField label="Remitente">
          <InlineField value={draft.sender_name} onChange={(v) => update('sender_name', v)} placeholder="Quién envía…" />
        </DetailField>
        <DetailField label="Tel. remitente">
          <InlineField value={draft.sender_phone} onChange={(v) => update('sender_phone', v)} />
        </DetailField>

        <DetailField label="Recolección">
          <InlineField type="buttons" value={draft.origin_type} options={ORIGIN_TYPE_OPTIONS} onChange={(v) => update('origin_type', v)} />
        </DetailField>
        <DetailField
          label={draft.origin_type === 'branch' ? 'Sucursal de recolección' : 'Domicilio de recolección'}
          required
          error={draft.origin_type === 'branch' ? errors.origin_branch_location_id : errors.origin_customer_location_id}
        >
          {draft.origin_type === 'branch' ? (
            <RelationSelect
              value={draft.origin_branch_location_id || null}
              displayLabel={draft.origin_branch_location_label || null}
              placeholder="Selecciona sucursal"
              onSearch={(query) => searchLocations(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.name })))}
              onSelect={(option) => {
                update('origin_branch_location_id', option?.id ?? '')
                update('origin_branch_location_label', option?.label ?? '')
              }}
            />
          ) : (
            <RelationSelect
              value={draft.origin_customer_location_id || null}
              displayLabel={draft.origin_customer_location_label || null}
              placeholder={draft.customer_id ? 'Selecciona domicilio' : 'Selecciona cliente primero'}
              disabled={!draft.customer_id}
              onSearch={(query) =>
                searchCustomerLocations(activeOrg!.id, draft.customer_id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.name })))
              }
              onSelect={(option) => {
                update('origin_customer_location_id', option?.id ?? '')
                update('origin_customer_location_label', option?.label ?? '')
              }}
              createLabel="Domicilio"
              renderCreateForm={
                draft.customer_id
                  ? ({ initialName, onCreated, onCancel }) => (
                      <CustomerLocationQuickCreate
                        customerId={draft.customer_id}
                        initialName={initialName}
                        onCreated={onCreated}
                        onCancel={onCancel}
                      />
                    )
                  : undefined
              }
            />
          )}
        </DetailField>
        {draft.origin_type === 'pickup' && (
          <DetailField label="GPS de recolección" full>
            <GpsCaptureField
              latitude={draft.pickup_latitude}
              longitude={draft.pickup_longitude}
              capturedAt={draft.pickup_captured_at}
              onCapture={(lat, lng, capturedAt) => {
                update('pickup_latitude', lat)
                update('pickup_longitude', lng)
                update('pickup_captured_at', capturedAt)
              }}
              label="Capturar GPS de recolección"
            />
          </DetailField>
        )}
      </DetailGrid>
    </DetailSection>
  )

  const sectionDestino = (
    <DetailSection title="Destinatario y entrega" description="Quién recibe y con qué operador/vehículo se entrega.">
      <DetailGrid>
        <DetailField label="Destinatario" required error={errors.receiver_name}>
          <InlineField value={draft.receiver_name} onChange={(v) => update('receiver_name', v)} placeholder="Quién recibe…" />
        </DetailField>
        <DetailField label="Tel. destinatario">
          <InlineField value={draft.receiver_phone} onChange={(v) => update('receiver_phone', v)} />
        </DetailField>

        <DetailField label="Domicilio de entrega" required error={errors.customer_location_id}>
          <RelationSelect
            value={draft.customer_location_id || null}
            displayLabel={draft.customer_location_label || null}
            placeholder={draft.customer_id ? 'Selecciona domicilio' : 'Selecciona cliente primero'}
            disabled={!draft.customer_id}
            onSearch={(query) =>
              searchCustomerLocations(activeOrg!.id, draft.customer_id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.name })))
            }
            onSelect={(option) => {
              update('customer_location_id', option?.id ?? '')
              update('customer_location_label', option?.label ?? '')
            }}
            createLabel="Domicilio"
            renderCreateForm={
              draft.customer_id
                ? ({ initialName, onCreated, onCancel }) => (
                    <CustomerLocationQuickCreate
                      customerId={draft.customer_id}
                      initialName={initialName}
                      onCreated={onCreated}
                      onCancel={onCancel}
                    />
                  )
                : undefined
            }
          />
        </DetailField>
        <DetailField label="Operador asignado">
          <RelationSelect
            value={draft.assigned_driver_id || null}
            displayLabel={draft.assigned_driver_label || null}
            placeholder="Sin asignar"
            onSearch={(query) =>
              searchDrivers(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: `${r.first_name} ${r.last_name}` })))
            }
            onSelect={(option) => {
              update('assigned_driver_id', option?.id ?? '')
              update('assigned_driver_label', option?.label ?? '')
            }}
          />
        </DetailField>

        <DetailField label="Vehículo asignado">
          <RelationSelect
            value={draft.assigned_vehicle_id || null}
            displayLabel={draft.assigned_vehicle_label || null}
            placeholder="Sin asignar"
            onSearch={(query) =>
              searchVehicles(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.economic_number ?? r.plate ?? r.id })))
            }
            onSelect={(option) => {
              update('assigned_vehicle_id', option?.id ?? '')
              update('assigned_vehicle_label', option?.label ?? '')
            }}
          />
        </DetailField>
        <DetailField label="Tiempo de servicio (min)">
          <InlineField type="number" value={draft.estimated_service_minutes} onChange={(v) => update('estimated_service_minutes', v)} />
        </DetailField>
        <DetailField label="GPS de entrega" full>
          <GpsCaptureField
            latitude={draft.delivery_latitude}
            longitude={draft.delivery_longitude}
            capturedAt={draft.delivery_captured_at}
            onCapture={(lat, lng, capturedAt) => {
              update('delivery_latitude', lat)
              update('delivery_longitude', lng)
              update('delivery_captured_at', capturedAt)
            }}
            label="Capturar GPS de entrega"
          />
        </DetailField>
      </DetailGrid>
    </DetailSection>
  )

  const sectionPaquete = (
    <>
      <DetailSection title="Paquete y cobro" description="Contenido, valor declarado, seguro y montos a cobrar.">
        <DetailGrid>
          <DetailField label="Contenido del paquete" full>
            <InlineField
              type="textarea"
              value={draft.content_description}
              onChange={(v) => update('content_description', v)}
              placeholder="Qué se está enviando…"
            />
          </DetailField>

          <DetailField label="Valor declarado">
            <InlineField type="number" value={draft.declared_value} onChange={(v) => update('declared_value', v)} />
          </DetailField>
          <DetailField label="Cobro contra entrega">
            <InlineField type="number" value={draft.cod_amount} onChange={(v) => update('cod_amount', v)} />
          </DetailField>

          <DetailField label="Con seguro">
            <InlineField type="checkbox" value={draft.has_insurance ? 'true' : 'false'} onChange={(v) => update('has_insurance', v === 'true')} />
          </DetailField>
          <DetailField label="Seguro (%  del valor declarado)">
            {draft.has_insurance ? (
              <div className="flex items-center gap-2">
                <div className="w-24">
                  <InlineField type="number" value={draft.insurance_percentage} onChange={(v) => update('insurance_percentage', v)} />
                </div>
                <span className="text-sm text-gray-500">
                  {(() => {
                    const declared = toNullableNumber(draft.declared_value)
                    const pct = toNullableNumber(draft.insurance_percentage)
                    if (declared == null || pct == null) return '— importe del seguro'
                    return `= ${formatCurrency((declared * pct) / 100)}`
                  })()}
                </span>
              </div>
            ) : (
              <p className="px-1.5 py-1 text-sm text-gray-400">Sin seguro</p>
            )}
          </DetailField>

          <DetailField label="Monto">
            <InlineField type="number" value={draft.amount} onChange={(v) => update('amount', v)} />
          </DetailField>
          <DetailField label="Quién recibió">
            <InlineField value={draft.received_by_name} onChange={(v) => update('received_by_name', v)} placeholder="Se captura al entregar" />
          </DetailField>
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Instrucciones">
        <DetailGrid>
          <DetailField label="Instrucciones" full>
            <InlineField type="textarea" value={draft.instructions} onChange={(v) => update('instructions', v)} />
          </DetailField>
        </DetailGrid>
      </DetailSection>
    </>
  )

  return (
    <>
      <div className="flex h-full flex-col">
        {!hideHeader && (
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
            <button type="button" onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
              <ArrowLeft size={15} strokeWidth={2} />
              {backLabel}
            </button>
            {job && (
              <Can permission="jobs.manage">
                <button type="button" onClick={() => setDeleteOpen(true)} className="text-sm font-medium text-red-600 hover:text-red-700">
                  Eliminar
                </button>
              </Can>
            )}
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-y-auto bg-white lg:flex-row lg:overflow-hidden">
          <div className="flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:overflow-y-auto">
            {jobQuery.isLoading && <Skeleton className="h-64" />}
            {jobQuery.isError && <ErrorState message="No se pudo cargar el pedido." onRetry={() => void jobQuery.refetch()} />}

            {job && (
              <div className="flex max-w-6xl flex-col gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-ink">{draft.job_number || 'Pedido'}</h1>
                  <p className="text-sm text-gray-500">{draft.customer_label || 'Sin cliente'}</p>
                </div>

                {sectionDatos}
                {sectionOrigen}
                {sectionDestino}
                {sectionPaquete}

                <div>
                  <Tabs items={[{ key: 'paquetes', label: 'Paquetes', count: packagesQuery.data?.length }]} active={tab} onChange={setTab} />
                  {tab === 'paquetes' && <JobPackagesTab jobId={id} />}
                </div>
              </div>
            )}
          </div>

          <Can permission="audit.view">
            <div className="shrink-0 border-t border-gray-200 lg:w-80 lg:border-l lg:border-t-0">
              <HistoryPanel entityType="jobs" entityId={id} />
            </div>
          </Can>
        </div>

        <SaveDiscardBar dirty={dirty} saving={saving} onSave={handleSave} onDiscard={handleDiscard} />
      </div>

      <ConfirmDialog
        open={leaveConfirmOpen}
        title="Cambios sin guardar"
        description="Si sales ahora perderás los cambios que no has guardado. ¿Quieres continuar?"
        confirmLabel="Salir sin guardar"
        danger
        onConfirm={onBack}
        onCancel={() => setLeaveConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar pedido"
        description={`¿Seguro que quieres eliminar "${draft.job_number || 'este pedido'}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(id, { onSuccess: onBack })}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
