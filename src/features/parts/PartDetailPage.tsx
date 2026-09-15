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
import { PART_UNITS, type Part } from '@/features/parts/api/partsApi'
import { useCreatePart, useDeletePart, usePart, useUpdatePart } from '@/features/parts/hooks/useParts'

const UNIT_OPTIONS = PART_UNITS.map((u) => ({ value: u.value, label: u.label }))

interface Draft {
  sku: string
  name: string
  category: string
  unit: string
  unit_cost: string
  quantity_on_hand: string
  min_stock: string
  supplier: string
  notes: string
  active: boolean
}

function toDraft(part?: Part): Draft {
  return {
    sku: part?.sku ?? '',
    name: part?.name ?? '',
    category: part?.category ?? '',
    unit: part?.unit ?? 'pza',
    unit_cost: part?.unit_cost != null ? String(part.unit_cost) : '',
    quantity_on_hand: part ? String(part.quantity_on_hand) : '0',
    min_stock: part?.min_stock != null ? String(part.min_stock) : '',
    supplier: part?.supplier ?? '',
    notes: part?.notes ?? '',
    active: part?.active ?? true,
  }
}

export function PartDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'nuevo'
  const navigate = useNavigate()

  const partQuery = usePart(isNew ? undefined : id)
  const createMutation = useCreatePart()
  const updateMutation = useUpdatePart()
  const deleteMutation = useDeletePart()

  const [draft, setDraft] = useState<Draft>(() => toDraft())
  const [original, setOriginal] = useState<Draft>(() => toDraft())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (partQuery.data) {
      const next = toDraft(partQuery.data)
      setDraft(next)
      setOriginal(next)
    }
  }, [partQuery.data])

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
      navigate('/refacciones')
    }
  }

  function handleSave() {
    if (!draft.name.trim()) {
      setErrors({ name: 'Campo obligatorio' })
      return
    }

    const input = {
      sku: draft.sku || null,
      name: draft.name,
      category: draft.category || null,
      unit: draft.unit,
      unit_cost: draft.unit_cost.trim() === '' ? null : Number(draft.unit_cost),
      quantity_on_hand: Number(draft.quantity_on_hand) || 0,
      min_stock: draft.min_stock.trim() === '' ? null : Number(draft.min_stock),
      supplier: draft.supplier || null,
      notes: draft.notes || null,
      active: draft.active,
    }

    if (isNew) {
      createMutation.mutate(input, {
        onSuccess: (created) => navigate(`/refacciones/${created.id}`, { replace: true }),
      })
    } else if (id) {
      updateMutation.mutate({ id, input }, { onSuccess: () => setOriginal(draft) })
    }
  }

  function handleDiscard() {
    if (isNew) {
      navigate('/refacciones')
    } else {
      setDraft(original)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending
  const part = partQuery.data

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <button type="button" onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
            <ArrowLeft size={15} strokeWidth={2} />
            Refacciones
          </button>
          {!isNew && part && (
            <Can permission="maintenance.manage">
              <button type="button" onClick={() => setDeleteOpen(true)} className="text-sm font-medium text-red-600 hover:text-red-700">
                Eliminar
              </button>
            </Can>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto bg-white lg:flex-row lg:overflow-hidden">
          <div className="flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:overflow-y-auto">
            {!isNew && partQuery.isLoading && <Skeleton className="h-64" />}
            {!isNew && partQuery.isError && (
              <ErrorState message="No se pudo cargar la refacción." onRetry={() => void partQuery.refetch()} />
            )}

            {(isNew || part) && (
              <div className="flex max-w-4xl flex-col gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-ink">{draft.name || (isNew ? 'Nueva refacción' : 'Refacción')}</h1>
                  <p className="text-sm text-gray-500">
                    {Number(draft.quantity_on_hand || 0).toLocaleString('es-MX')} {draft.unit} en existencia
                  </p>
                </div>

                <DetailSection title="Identificación" description="Nombre, número de parte y categoría.">
                  <DetailGrid>
                    <DetailField label="Nombre" required error={errors.name}>
                      <InlineField value={draft.name} onChange={(v) => update('name', v)} placeholder="Nombre de la refacción" />
                    </DetailField>
                    <DetailField label="No. de parte">
                      <InlineField value={draft.sku} onChange={(v) => update('sku', v)} placeholder="Agregar…" />
                    </DetailField>

                    <DetailField label="Categoría">
                      <InlineField value={draft.category} onChange={(v) => update('category', v)} placeholder="Agregar…" />
                    </DetailField>
                    <DetailField label="Proveedor">
                      <InlineField value={draft.supplier} onChange={(v) => update('supplier', v)} placeholder="Agregar…" />
                    </DetailField>

                    <DetailField label="Activa">
                      <InlineField type="checkbox" value={draft.active ? 'true' : 'false'} onChange={(v) => update('active', v === 'true')} />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Existencia" description="Unidad, costo e inventario disponible.">
                  <DetailGrid>
                    <DetailField label="Unidad">
                      <InlineField type="buttons" value={draft.unit} options={UNIT_OPTIONS} onChange={(v) => update('unit', v)} />
                    </DetailField>
                    <DetailField label="Costo unitario">
                      <InlineField type="number" value={draft.unit_cost} onChange={(v) => update('unit_cost', v)} placeholder="0.00" />
                    </DetailField>

                    <DetailField label="Existencia actual">
                      <InlineField type="number" value={draft.quantity_on_hand} onChange={(v) => update('quantity_on_hand', v)} />
                    </DetailField>
                    <DetailField label="Existencia mínima">
                      <InlineField type="number" value={draft.min_stock} onChange={(v) => update('min_stock', v)} placeholder="Agregar…" />
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
                <HistoryPanel entityType="parts" entityId={id} />
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
        onConfirm={() => navigate('/refacciones')}
        onCancel={() => setLeaveConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar refacción"
        description={`¿Seguro que quieres eliminar "${draft.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => id && deleteMutation.mutate(id, { onSuccess: () => navigate('/refacciones') })}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
