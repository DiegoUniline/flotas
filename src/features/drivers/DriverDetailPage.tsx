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
import { DRIVER_STATUSES, type Driver } from '@/features/drivers/api/driversApi'
import { useCreateDriver, useDeleteDriver, useUpdateDriver } from '@/features/drivers/hooks/useDrivers'
import { useDriver, useDriverLicenses, useDriverCertifications } from '@/features/drivers/hooks/useDriverDetail'
import { DriverAssignmentSection } from './components/DriverAssignmentSection'
import { DriverLicensesSection } from './components/DriverLicensesSection'
import { DriverCertificationsSection } from './components/DriverCertificationsSection'

const STATUS_OPTIONS = DRIVER_STATUSES.map((s) => ({ value: s.value, label: s.label }))

interface Draft {
  first_name: string
  last_name: string
  employee_number: string
  status: string
  phone: string
  email: string
  emergency_contact_name: string
  emergency_contact_phone: string
  hire_date: string
  termination_date: string
  primary_location_id: string
  primary_location_label: string
  notes: string
  active: boolean
}

function toDraft(driver?: Driver & { locations?: { name: string } | null }): Draft {
  return {
    first_name: driver?.first_name ?? '',
    last_name: driver?.last_name ?? '',
    employee_number: driver?.employee_number ?? '',
    status: driver?.status ?? 'active',
    phone: driver?.phone ?? '',
    email: driver?.email ?? '',
    emergency_contact_name: driver?.emergency_contact_name ?? '',
    emergency_contact_phone: driver?.emergency_contact_phone ?? '',
    hire_date: driver?.hire_date ?? '',
    termination_date: driver?.termination_date ?? '',
    primary_location_id: driver?.primary_location_id ?? '',
    primary_location_label: driver?.locations?.name ?? '',
    notes: driver?.notes ?? '',
    active: driver?.active ?? true,
  }
}

export function DriverDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'nuevo'
  const navigate = useNavigate()
  const { activeOrg } = useOrg()

  const driverQuery = useDriver(isNew ? undefined : id)
  const createMutation = useCreateDriver()
  const updateMutation = useUpdateDriver()
  const deleteMutation = useDeleteDriver()
  const licensesQuery = useDriverLicenses(isNew ? undefined : id)
  const certificationsQuery = useDriverCertifications(isNew ? undefined : id)

  const [draft, setDraft] = useState<Draft>(() => toDraft())
  const [original, setOriginal] = useState<Draft>(() => toDraft())
  const [tab, setTab] = useState('asignacion')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (driverQuery.data) {
      const next = toDraft(driverQuery.data)
      setDraft(next)
      setOriginal(next)
    }
  }, [driverQuery.data])

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
      navigate('/operadores')
    }
  }

  function handleSave() {
    const nextErrors: Record<string, string> = {}
    if (!draft.first_name.trim()) nextErrors.first_name = 'Campo obligatorio'
    if (!draft.last_name.trim()) nextErrors.last_name = 'Campo obligatorio'
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const input = {
      first_name: draft.first_name,
      last_name: draft.last_name,
      employee_number: draft.employee_number || null,
      status: draft.status,
      phone: draft.phone || null,
      email: draft.email || null,
      emergency_contact_name: draft.emergency_contact_name || null,
      emergency_contact_phone: draft.emergency_contact_phone || null,
      hire_date: draft.hire_date || null,
      termination_date: draft.termination_date || null,
      primary_location_id: draft.primary_location_id || null,
      notes: draft.notes || null,
      active: draft.active,
    }

    if (isNew) {
      createMutation.mutate(input, {
        onSuccess: (created) => navigate(`/operadores/${created.id}`, { replace: true }),
      })
    } else if (id) {
      updateMutation.mutate({ id, input }, { onSuccess: () => setOriginal(draft) })
    }
  }

  function handleDiscard() {
    if (isNew) {
      navigate('/operadores')
    } else {
      setDraft(original)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending
  const driver = driverQuery.data

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <button type="button" onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
            <ArrowLeft size={15} strokeWidth={2} />
            Operadores
          </button>
          {!isNew && driver && (
            <Can permission="drivers.delete">
              <button type="button" onClick={() => setDeleteOpen(true)} className="text-sm font-medium text-red-600 hover:text-red-700">
                Eliminar
              </button>
            </Can>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {!isNew && driverQuery.isLoading && <Skeleton className="h-64" />}
            {!isNew && driverQuery.isError && (
              <ErrorState message="No se pudo cargar el operador." onRetry={() => void driverQuery.refetch()} />
            )}

            {(isNew || driver) && (
              <div className="flex max-w-6xl flex-col gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-ink">
                    {draft.first_name || draft.last_name ? `${draft.first_name} ${draft.last_name}` : isNew ? 'Nuevo operador' : 'Operador'}
                  </h1>
                  <p className="text-sm text-gray-500">{draft.employee_number ? `No. ${draft.employee_number}` : 'Sin número de empleado'}</p>
                </div>

                <DetailSection title="Identificación" description="Datos personales y estado del operador.">
                  <DetailGrid>
                    <DetailField label="Nombre(s)" required error={errors.first_name}>
                      <InlineField value={draft.first_name} onChange={(v) => update('first_name', v)} />
                    </DetailField>
                    <DetailField label="Apellidos" required error={errors.last_name}>
                      <InlineField value={draft.last_name} onChange={(v) => update('last_name', v)} />
                    </DetailField>

                    <DetailField label="No. empleado">
                      <InlineField value={draft.employee_number} onChange={(v) => update('employee_number', v)} placeholder="Agregar…" />
                    </DetailField>
                    <DetailField label="Estado">
                      <InlineField type="buttons" value={draft.status} options={STATUS_OPTIONS} onChange={(v) => update('status', v)} />
                    </DetailField>

                    <DetailField label="Activo">
                      <InlineField type="checkbox" value={draft.active ? 'true' : 'false'} onChange={(v) => update('active', v === 'true')} />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Contacto" description="Teléfono, correo y contacto de emergencia.">
                  <DetailGrid>
                    <DetailField label="Teléfono">
                      <InlineField value={draft.phone} onChange={(v) => update('phone', v)} />
                    </DetailField>
                    <DetailField label="Correo">
                      <InlineField value={draft.email} onChange={(v) => update('email', v)} />
                    </DetailField>

                    <DetailField label="Contacto de emergencia">
                      <InlineField value={draft.emergency_contact_name} onChange={(v) => update('emergency_contact_name', v)} />
                    </DetailField>
                    <DetailField label="Tel. de emergencia">
                      <InlineField value={draft.emergency_contact_phone} onChange={(v) => update('emergency_contact_phone', v)} />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Empleo" description="Fechas de ingreso/baja y sucursal base.">
                  <DetailGrid>
                    <DetailField label="Fecha de ingreso">
                      <InlineField type="date" value={draft.hire_date} onChange={(v) => update('hire_date', v)} />
                    </DetailField>
                    <DetailField label="Fecha de baja">
                      <InlineField type="date" value={draft.termination_date} onChange={(v) => update('termination_date', v)} />
                    </DetailField>

                    <DetailField label="Sucursal base">
                      <RelationSelect
                        value={draft.primary_location_id || null}
                        displayLabel={draft.primary_location_label || null}
                        placeholder="Sin asignar"
                        onSearch={(query) =>
                          searchLocations(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.name })))
                        }
                        onSelect={(option) => {
                          update('primary_location_id', option?.id ?? '')
                          update('primary_location_label', option?.label ?? '')
                        }}
                        createLabel="Sucursal"
                        renderCreateForm={({ initialName, onCreated, onCancel }) => (
                          <LocationQuickCreate initialName={initialName} onCreated={onCreated} onCancel={onCancel} />
                        )}
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
                        { key: 'asignacion', label: 'Vehículo asignado' },
                        { key: 'licencias', label: 'Licencias', count: licensesQuery.data?.length },
                        { key: 'certificaciones', label: 'Certificaciones', count: certificationsQuery.data?.length },
                      ]}
                      active={tab}
                      onChange={setTab}
                    />
                    {tab === 'asignacion' && <DriverAssignmentSection driverId={id} />}
                    {tab === 'licencias' && <DriverLicensesSection driverId={id} />}
                    {tab === 'certificaciones' && <DriverCertificationsSection driverId={id} />}
                  </div>
                )}
              </div>
            )}
          </div>

          {!isNew && id && (
            <Can permission="audit.view">
              <div className="w-80 shrink-0 border-l border-gray-200">
                <HistoryPanel entityType="drivers" entityId={id} />
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
        onConfirm={() => navigate('/operadores')}
        onCancel={() => setLeaveConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar operador"
        description={`¿Seguro que quieres eliminar a "${draft.first_name} ${draft.last_name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => id && deleteMutation.mutate(id, { onSuccess: () => navigate('/operadores') })}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
