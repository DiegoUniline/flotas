import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DetailField, DetailGrid, DetailSection } from '@/components/ui/DetailGrid'
import { InlineField } from '@/components/ui/InlineField'
import { SaveDiscardBar } from '@/components/ui/SaveDiscardBar'
import { HistoryPanel } from '@/components/audit/HistoryPanel'
import { Can } from '@/components/Can'
import { CUSTOMER_STATUSES, type Customer } from '@/features/customers/api/customersApi'
import { useCreateCustomer, useDeleteCustomer, useUpdateCustomer } from '@/features/customers/hooks/useCustomers'
import { useCustomer } from '@/features/customers/hooks/useCustomerDetail'
import { CustomerLocationsSection } from './components/CustomerLocationsSection'

const STATUS_OPTIONS = CUSTOMER_STATUSES.map((s) => ({ value: s.value, label: s.label }))

interface Draft {
  code: string
  name: string
  legal_name: string
  phone: string
  email: string
  tax_id: string
  status: string
  notes: string
}

function toDraft(customer?: Customer): Draft {
  return {
    code: customer?.code ?? '',
    name: customer?.name ?? '',
    legal_name: customer?.legal_name ?? '',
    phone: customer?.phone ?? '',
    email: customer?.email ?? '',
    tax_id: customer?.tax_id ?? '',
    status: customer?.status ?? 'active',
    notes: customer?.notes ?? '',
  }
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'nuevo'
  const navigate = useNavigate()

  const customerQuery = useCustomer(isNew ? undefined : id)
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()
  const deleteMutation = useDeleteCustomer()

  const [draft, setDraft] = useState<Draft>(() => toDraft())
  const [original, setOriginal] = useState<Draft>(() => toDraft())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (customerQuery.data) {
      const next = toDraft(customerQuery.data)
      setDraft(next)
      setOriginal(next)
    }
  }, [customerQuery.data])

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
      navigate('/clientes')
    }
  }

  function handleSave() {
    if (!draft.name.trim()) {
      setErrors({ name: 'Campo obligatorio' })
      return
    }

    const input = {
      code: draft.code || null,
      name: draft.name,
      legal_name: draft.legal_name || null,
      phone: draft.phone || null,
      email: draft.email || null,
      tax_id: draft.tax_id || null,
      status: draft.status,
      notes: draft.notes || null,
    }

    if (isNew) {
      createMutation.mutate(input, {
        onSuccess: (created) => navigate(`/clientes/${created.id}`, { replace: true }),
      })
    } else if (id) {
      updateMutation.mutate({ id, input }, { onSuccess: () => setOriginal(draft) })
    }
  }

  function handleDiscard() {
    if (isNew) {
      navigate('/clientes')
    } else {
      setDraft(original)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending
  const customer = customerQuery.data

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <button type="button" onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
            <ArrowLeft size={15} strokeWidth={2} />
            Clientes
          </button>
          {!isNew && customer && (
            <Can permission="jobs.manage">
              <button type="button" onClick={() => setDeleteOpen(true)} className="text-sm font-medium text-red-600 hover:text-red-700">
                Eliminar
              </button>
            </Can>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {!isNew && customerQuery.isLoading && <Skeleton className="h-64" />}
            {!isNew && customerQuery.isError && (
              <ErrorState message="No se pudo cargar el cliente." onRetry={() => void customerQuery.refetch()} />
            )}

            {(isNew || customer) && (
              <div className="flex max-w-6xl flex-col gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-ink">{draft.name || (isNew ? 'Nuevo cliente' : 'Cliente')}</h1>
                  <p className="text-sm text-gray-500">{draft.code ? `Código: ${draft.code}` : 'Sin código'}</p>
                </div>

                <DetailSection title="Identificación" description="Datos generales del cliente.">
                  <DetailGrid>
                    <DetailField label="Nombre" required error={errors.name}>
                      <InlineField value={draft.name} onChange={(v) => update('name', v)} />
                    </DetailField>
                    <DetailField label="Código">
                      <InlineField value={draft.code} onChange={(v) => update('code', v)} placeholder="Agregar…" />
                    </DetailField>

                    <DetailField label="Razón social">
                      <InlineField value={draft.legal_name} onChange={(v) => update('legal_name', v)} />
                    </DetailField>
                    <DetailField label="RFC">
                      <InlineField value={draft.tax_id} onChange={(v) => update('tax_id', v)} />
                    </DetailField>

                    <DetailField label="Estado">
                      <InlineField type="buttons" value={draft.status} options={STATUS_OPTIONS} onChange={(v) => update('status', v)} />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Contacto">
                  <DetailGrid>
                    <DetailField label="Teléfono">
                      <InlineField value={draft.phone} onChange={(v) => update('phone', v)} />
                    </DetailField>
                    <DetailField label="Correo">
                      <InlineField value={draft.email} onChange={(v) => update('email', v)} />
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

                {!isNew && id && <CustomerLocationsSection customerId={id} />}
              </div>
            )}
          </div>

          {!isNew && id && (
            <Can permission="audit.view">
              <div className="w-80 shrink-0 border-l border-gray-200">
                <HistoryPanel entityType="customers" entityId={id} />
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
        onConfirm={() => navigate('/clientes')}
        onCancel={() => setLeaveConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar cliente"
        description={`¿Seguro que quieres eliminar "${draft.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => id && deleteMutation.mutate(id, { onSuccess: () => navigate('/clientes') })}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
