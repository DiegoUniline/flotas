import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DetailField, DetailGrid, DetailSection } from '@/components/ui/DetailGrid'
import { InlineField } from '@/components/ui/InlineField'
import { RelationSelect } from '@/components/ui/RelationSelect'
import { GpsCaptureField } from '@/components/ui/GpsCaptureField'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useOrg } from '@/context/OrgContext'
import { searchCustomers } from '@/features/customers/api/customersApi'
import { searchCustomerLocations } from '@/features/customers/api/customerLocationsApi'
import { CustomerQuickCreate } from '@/features/customers/components/CustomerQuickCreate'
import { CustomerLocationQuickCreate } from '@/features/customers/components/CustomerLocationQuickCreate'
import { searchLocations } from '@/features/locations/api/locationsApi'
import { searchDrivers } from '@/features/drivers/api/driversApi'
import { searchVehicles } from '@/features/vehicles/api/vehiclesApi'
import { JOB_PRIORITIES, JOB_STATUSES, JOB_TYPES, ORIGIN_TYPES, generateJobId, generateJobNumber } from '@/features/jobs/api/jobsApi'
import { useCreateJob } from '@/features/jobs/hooks/useJobs'
import { formatCurrency } from '@/lib/format'
import { JobDetailContent } from './JobDetailContent'

const TYPE_OPTIONS = JOB_TYPES.map((t) => ({ value: t.value, label: t.label }))
const STATUS_OPTIONS = JOB_STATUSES.map((s) => ({ value: s.value, label: s.label }))
const PRIORITY_OPTIONS = JOB_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))
const ORIGIN_TYPE_OPTIONS = ORIGIN_TYPES.map((o) => ({ value: o.value, label: o.label }))

interface Draft {
  id: string
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

function emptyDraft(): Draft {
  return {
    // Se generan aquí, al abrir el formulario — no al guardar — para que
    // el folio "nazca" desde el primer momento, sin conexión incluida (ver
    // el comentario de `generateJobNumber` en jobsApi.ts).
    id: generateJobId(),
    job_number: generateJobNumber(),
    job_type: 'delivery',
    status: 'pending',
    priority: 'normal',
    customer_id: '',
    customer_label: '',
    scheduled_date: '',
    time_window_start: '',
    time_window_end: '',
    sender_name: '',
    sender_phone: '',
    origin_type: 'pickup',
    origin_customer_location_id: '',
    origin_customer_location_label: '',
    origin_branch_location_id: '',
    origin_branch_location_label: '',
    receiver_name: '',
    receiver_phone: '',
    customer_location_id: '',
    customer_location_label: '',
    assigned_driver_id: '',
    assigned_driver_label: '',
    assigned_vehicle_id: '',
    assigned_vehicle_label: '',
    estimated_service_minutes: '',
    content_description: '',
    declared_value: '',
    cod_amount: '',
    amount: '',
    received_by_name: '',
    received_at: null,
    instructions: '',
    pickup_latitude: null,
    pickup_longitude: null,
    pickup_captured_at: null,
    delivery_latitude: null,
    delivery_longitude: null,
    delivery_captured_at: null,
    has_insurance: false,
    insurance_percentage: '',
  }
}

const WIZARD_DRAFT_KEY = 'flotaa:job-wizard-draft'

interface WizardDraft {
  draft: Draft
  step: number
}

/** Borrador del wizard de "Nuevo pedido" en sessionStorage — sobrevive a un
 * recargo de la pestaña (a diferencia del state de React) pero se limpia al
 * cerrar la pestaña o al terminar el flujo (crear o cancelar). No es
 * configuración ni preferencia del usuario, es contenido de un formulario
 * sin guardar — por eso no aplica la regla general de "nada de
 * localStorage" (esa es para permisos/config, ver CLAUDE.md). */
function loadWizardDraft(): WizardDraft | null {
  try {
    const raw = sessionStorage.getItem(WIZARD_DRAFT_KEY)
    return raw ? (JSON.parse(raw) as WizardDraft) : null
  } catch {
    return null
  }
}

function saveWizardDraft(value: WizardDraft) {
  try {
    sessionStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(value))
  } catch {
    // Almacenamiento no disponible (modo privado, cuota llena, etc.) — el
    // wizard sigue funcionando, solo sin recuperación tras recargar.
  }
}

function clearWizardDraft() {
  try {
    sessionStorage.removeItem(WIZARD_DRAFT_KEY)
  } catch {
    // ignorar
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

/** Ruta `/pedidos/:id`. `id === 'nuevo'` abre el wizard de creación en un
 * `Modal` (ver CLAUDE.md, "Crear pedido: wizard en ventana emergente").
 * Editar un pedido existente delega todo a `JobDetailContent` — la misma
 * ficha completa se reutiliza embebida en un `Modal` desde el Centro de
 * control (pedido del usuario: "ver pedido completo" no debe navegar a
 * otra vista), así que esta página ya no duplica esa lógica. */
export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'nuevo'
  const navigate = useNavigate()
  const { activeOrg } = useOrg()

  const createMutation = useCreateJob()

  const [draft, setDraft] = useState<Draft>(() => loadWizardDraft()?.draft ?? emptyDraft())
  const [original] = useState<Draft>(() => emptyDraft())
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [step, setStep] = useState(() => loadWizardDraft()?.step ?? 0)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    saveWizardDraft({ draft, step })
  }, [draft, step])

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

  function validateStep(stepIndex: number): Record<string, string> {
    const stepErrors: Record<string, string> = {}
    if (stepIndex === 0 && !draft.customer_id) {
      stepErrors.customer_id = 'Campo obligatorio'
    }
    if (stepIndex === 1) {
      if (draft.origin_type === 'branch' && !draft.origin_branch_location_id) {
        stepErrors.origin_branch_location_id = 'Campo obligatorio'
      }
      if (draft.origin_type === 'pickup' && !draft.origin_customer_location_id) {
        stepErrors.origin_customer_location_id = 'Campo obligatorio'
      }
    }
    if (stepIndex === 2) {
      if (!draft.receiver_name.trim()) stepErrors.receiver_name = 'Campo obligatorio'
      if (!draft.customer_location_id) stepErrors.customer_location_id = 'Campo obligatorio'
    }
    return stepErrors
  }

  function validateAll(): { valid: boolean; firstInvalidStep: number } {
    for (let i = 0; i < 3; i++) {
      const stepErrors = validateStep(i)
      if (Object.keys(stepErrors).length > 0) {
        setErrors((current) => ({ ...current, ...stepErrors }))
        return { valid: false, firstInvalidStep: i }
      }
    }
    return { valid: true, firstInvalidStep: 0 }
  }

  function handleBack() {
    if (dirty) {
      setLeaveConfirmOpen(true)
    } else {
      clearWizardDraft()
      navigate('/pedidos')
    }
  }

  function handleSave() {
    const { valid, firstInvalidStep } = validateAll()
    if (!valid) {
      setStep(firstInvalidStep)
      return
    }

    const input = {
      // id/job_number SÍ se mandan explícitos — se generaron al abrir el
      // formulario (ver emptyDraft), no los asigna el servidor. Ver el
      // comentario de generateJobNumber() en jobsApi.ts.
      id: draft.id,
      job_number: draft.job_number,
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
      received_at: draft.received_at,
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

    createMutation.mutate(input, {
      onSuccess: (created) => {
        clearWizardDraft()
        navigate(`/pedidos/${created.id}`, { replace: true })
      },
    })
  }

  if (!isNew) {
    return <JobDetailContent id={id!} onBack={() => navigate('/pedidos')} />
  }

  const saving = createMutation.isPending

  const sectionDatos = (
    <DetailSection title="Datos del pedido" description="Identificación, cliente y programación.">
      <DetailGrid>
        <DetailField label="Folio">
          <InlineField value={draft.job_number} onChange={() => {}} readOnly />
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
                searchCustomerLocations(draft.customer_id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.name })))
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
              searchCustomerLocations(draft.customer_id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.name })))
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

  const WIZARD_STEPS = [
    { title: 'Datos del pedido', node: sectionDatos },
    { title: 'Remitente y recolección', node: sectionOrigen },
    { title: 'Destinatario y entrega', node: sectionDestino },
    { title: 'Paquete y cobro', node: sectionPaquete },
  ]
  const isLastStep = step === WIZARD_STEPS.length - 1

  return (
    <>
      <Modal
        open
        title="Nuevo pedido"
        onClose={handleBack}
        closeOnBackdrop={false}
        footer={
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => (step === 0 ? handleBack() : setStep((s) => s - 1))} disabled={saving}>
              {step === 0 ? 'Cancelar' : 'Atrás'}
            </Button>
            <p className="text-xs text-gray-400">
              Paso {step + 1} de {WIZARD_STEPS.length}
            </p>
            {isLastStep ? (
              <Button onClick={handleSave} loading={saving}>
                Crear pedido
              </Button>
            ) : (
              <Button
                onClick={() => {
                  const stepErrors = validateStep(step)
                  if (Object.keys(stepErrors).length > 0) {
                    setErrors((current) => ({ ...current, ...stepErrors }))
                    return
                  }
                  setStep((s) => s + 1)
                }}
              >
                Siguiente
              </Button>
            )}
          </div>
        }
      >
        <div className="flex gap-6">
          <nav className="flex w-52 shrink-0 flex-col gap-1 border-r border-gray-100 pr-5">
            {WIZARD_STEPS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => setStep(i)}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                  i === step ? 'bg-accent-50 font-medium text-accent-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    i < step
                      ? 'bg-accent-500 text-white'
                      : i === step
                        ? 'border-2 border-accent-500 text-accent-600'
                        : 'border border-gray-300 text-gray-400'
                  }`}
                >
                  {i < step ? '✓' : i + 1}
                </span>
                {s.title}
              </button>
            ))}
          </nav>
          <div className="min-w-0 flex-1">{WIZARD_STEPS[step].node}</div>
        </div>
      </Modal>

      <ConfirmDialog
        open={leaveConfirmOpen}
        title="Cambios sin guardar"
        description="Si sales ahora perderás los cambios que no has guardado. ¿Quieres continuar?"
        confirmLabel="Salir sin guardar"
        danger
        onConfirm={() => {
          clearWizardDraft()
          navigate('/pedidos')
        }}
        onCancel={() => setLeaveConfirmOpen(false)}
      />
    </>
  )
}
