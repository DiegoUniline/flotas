import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, X } from 'lucide-react'
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
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES, type ExpenseWithRelations } from '@/features/expenses/api/expensesApi'
import { useCreateExpense, useDeleteExpense, useExpense, useSetExpenseStatus, useUpdateExpense } from '@/features/expenses/hooks/useExpenses'

const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))
const STATUS_LABEL = Object.fromEntries(EXPENSE_STATUSES.map((s) => [s.value, s.label]))
const STATUS_TONE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-500',
  approved: 'bg-status-active-bg text-status-active',
  rejected: 'bg-red-50 text-red-600',
}

interface Draft {
  category: string
  amount: string
  expense_date: string
  vehicle_id: string
  vehicle_label: string
  driver_id: string
  driver_label: string
  description: string
  notes: string
}

function toDraft(expense?: ExpenseWithRelations): Draft {
  return {
    category: expense?.category ?? 'other',
    amount: expense ? String(expense.amount) : '',
    expense_date: expense?.expense_date ?? new Date().toISOString().slice(0, 10),
    vehicle_id: expense?.vehicle_id ?? '',
    vehicle_label: expense?.vehicles ? (expense.vehicles.plate ? `${expense.vehicles.economic_number} · ${expense.vehicles.plate}` : expense.vehicles.economic_number) : '',
    driver_id: expense?.driver_id ?? '',
    driver_label: expense?.drivers ? `${expense.drivers.first_name} ${expense.drivers.last_name}` : '',
    description: expense?.description ?? '',
    notes: expense?.notes ?? '',
  }
}

export function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'nuevo'
  const navigate = useNavigate()
  const { activeOrg } = useOrg()

  const expenseQuery = useExpense(isNew ? undefined : id)
  const createMutation = useCreateExpense()
  const updateMutation = useUpdateExpense()
  const deleteMutation = useDeleteExpense()
  const statusMutation = useSetExpenseStatus()

  const [draft, setDraft] = useState<Draft>(() => toDraft())
  const [original, setOriginal] = useState<Draft>(() => toDraft())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (expenseQuery.data) {
      const next = toDraft(expenseQuery.data)
      setDraft(next)
      setOriginal(next)
    }
  }, [expenseQuery.data])

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
      navigate('/gastos')
    }
  }

  function handleSave() {
    const nextErrors: Record<string, string> = {}
    if (!draft.amount.trim() || Number(draft.amount) <= 0) nextErrors.amount = 'Ingresa el monto del gasto'
    if (!draft.expense_date) nextErrors.expense_date = 'Campo obligatorio'
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const input = {
      category: draft.category,
      amount: Number(draft.amount),
      expense_date: draft.expense_date,
      vehicle_id: draft.vehicle_id || null,
      driver_id: draft.driver_id || null,
      description: draft.description || null,
      notes: draft.notes || null,
    }

    if (isNew) {
      createMutation.mutate(input, {
        onSuccess: (created) => navigate(`/gastos/${created.id}`, { replace: true }),
      })
    } else if (id) {
      updateMutation.mutate({ id, input }, { onSuccess: () => setOriginal(draft) })
    }
  }

  function handleDiscard() {
    if (isNew) {
      navigate('/gastos')
    } else {
      setDraft(original)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending
  const expense = expenseQuery.data

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <button type="button" onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
            <ArrowLeft size={15} strokeWidth={2} />
            Gastos
          </button>
          <div className="flex items-center gap-3">
            {!isNew && expense && expense.status === 'pending' && (
              <Can permission="expenses.approve">
                <button
                  type="button"
                  onClick={() => id && statusMutation.mutate({ id, status: 'rejected' })}
                  disabled={statusMutation.isPending}
                  className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  <X size={15} strokeWidth={2} />
                  Rechazar
                </button>
                <button
                  type="button"
                  onClick={() => id && statusMutation.mutate({ id, status: 'approved' })}
                  disabled={statusMutation.isPending}
                  className="flex items-center gap-1 text-sm font-medium text-status-active hover:opacity-80 disabled:opacity-50"
                >
                  <Check size={15} strokeWidth={2} />
                  Aprobar
                </button>
              </Can>
            )}
            {!isNew && expense && (
              <Can permission="expenses.approve">
                <button type="button" onClick={() => setDeleteOpen(true)} className="text-sm font-medium text-red-600 hover:text-red-700">
                  Eliminar
                </button>
              </Can>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto bg-white lg:flex-row lg:overflow-hidden">
          <div className="flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:overflow-y-auto">
            {!isNew && expenseQuery.isLoading && <Skeleton className="h-64" />}
            {!isNew && expenseQuery.isError && (
              <ErrorState message="No se pudo cargar el gasto." onRetry={() => void expenseQuery.refetch()} />
            )}

            {(isNew || expense) && (
              <div className="flex max-w-4xl flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-semibold text-ink">
                      {CATEGORY_OPTIONS.find((c) => c.value === draft.category)?.label ?? draft.category}
                    </h1>
                    <p className="text-sm text-gray-500">{draft.description || (isNew ? 'Nuevo gasto' : 'Sin descripción')}</p>
                  </div>
                  {expense && (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[expense.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABEL[expense.status] ?? expense.status}
                    </span>
                  )}
                </div>

                <DetailSection title="Datos del gasto" description="Categoría, monto y fecha.">
                  <DetailGrid>
                    <DetailField label="Categoría">
                      <InlineField type="buttons" value={draft.category} options={CATEGORY_OPTIONS} onChange={(v) => update('category', v)} />
                    </DetailField>
                    <DetailField label="Monto" required error={errors.amount}>
                      <InlineField type="number" value={draft.amount} onChange={(v) => update('amount', v)} placeholder="0.00" />
                    </DetailField>

                    <DetailField label="Fecha" required error={errors.expense_date}>
                      <InlineField type="date" value={draft.expense_date} onChange={(v) => update('expense_date', v)} />
                    </DetailField>

                    <DetailField label="Descripción" full>
                      <InlineField value={draft.description} onChange={(v) => update('description', v)} placeholder="Agregar…" />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Relacionado a" description="Vehículo u operador asociado (opcional).">
                  <DetailGrid>
                    <DetailField label="Vehículo">
                      <RelationSelect
                        value={draft.vehicle_id || null}
                        displayLabel={draft.vehicle_label || null}
                        placeholder="Sin asignar"
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
              <div className="shrink-0 border-t border-gray-200 lg:w-80 lg:border-l lg:border-t-0">
                <HistoryPanel entityType="expenses" entityId={id} />
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
        onConfirm={() => navigate('/gastos')}
        onCancel={() => setLeaveConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar gasto"
        description="¿Seguro que quieres eliminar este gasto? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => id && deleteMutation.mutate(id, { onSuccess: () => navigate('/gastos') })}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
