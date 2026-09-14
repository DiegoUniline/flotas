import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { RelationSelect } from '@/components/ui/RelationSelect'
import { Can } from '@/components/Can'
import { useOrg } from '@/context/OrgContext'
import { formatCurrency } from '@/lib/format'
import { searchParts } from '@/features/parts/api/partsApi'
import type { MaintenanceRecordPartUpdate, MaintenanceRecordPartWithRelations } from '@/features/maintenance/api/maintenanceRecordPartsApi'
import {
  useCreateMaintenanceRecordPart,
  useDeleteMaintenanceRecordPart,
  useMaintenanceRecordParts,
  useUpdateMaintenanceRecordPart,
} from '@/features/maintenance/hooks/useMaintenanceRecordParts'

const CELL_INPUT_CLASSNAME =
  'w-full border-0 border-b-2 border-transparent bg-transparent px-1.5 py-1 text-sm text-gray-900 transition-colors hover:border-gray-200 focus:border-accent-500 focus:outline-none'

function toNullableNumber(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function PartRow({
  row,
  onSave,
  onDelete,
  deleting,
}: {
  row: MaintenanceRecordPartWithRelations
  onSave: (input: MaintenanceRecordPartUpdate) => void
  onDelete: () => void
  deleting: boolean
}) {
  const [draft, setDraft] = useState({
    quantity: String(row.quantity),
    unit_cost: row.unit_cost != null ? String(row.unit_cost) : '',
    notes: row.notes ?? '',
  })

  function update<K extends keyof typeof draft>(key: K, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function commit() {
    onSave({
      quantity: Number(draft.quantity) || 1,
      unit_cost: toNullableNumber(draft.unit_cost),
      notes: draft.notes || null,
    })
  }

  const total = Number(draft.quantity || 0) * Number(draft.unit_cost || 0)

  return (
    <tr className="border-b border-gray-100">
      <td className="px-2 py-1.5 text-gray-900">
        {row.parts?.name ?? 'Refacción eliminada'}
        {row.parts?.unit && <span className="ml-1 text-xs text-gray-400">({row.parts.unit})</span>}
      </td>
      <td className="px-2 py-1">
        <input type="number" min="0" step="0.01" value={draft.quantity} onChange={(e) => update('quantity', e.target.value)} onBlur={commit} className={CELL_INPUT_CLASSNAME} />
      </td>
      <td className="px-2 py-1">
        <input type="number" min="0" step="0.01" value={draft.unit_cost} onChange={(e) => update('unit_cost', e.target.value)} onBlur={commit} className={CELL_INPUT_CLASSNAME} />
      </td>
      <td className="px-2 py-1 text-gray-700">{formatCurrency(total)}</td>
      <td className="px-2 py-1">
        <input value={draft.notes} onChange={(e) => update('notes', e.target.value)} onBlur={commit} placeholder="Notas…" className={CELL_INPUT_CLASSNAME} />
      </td>
      <td className="px-2 py-1 text-right">
        <Can permission="maintenance.manage">
          <button type="button" onClick={onDelete} disabled={deleting} className="text-gray-400 hover:text-red-600 disabled:opacity-40">
            <Trash2 size={14} strokeWidth={2} />
          </button>
        </Can>
      </td>
    </tr>
  )
}

export function MaintenanceRecordPartsTab({ maintenanceRecordId }: { maintenanceRecordId: string }) {
  const { activeOrg } = useOrg()
  const partsQuery = useMaintenanceRecordParts(maintenanceRecordId)
  const createMutation = useCreateMaintenanceRecordPart(maintenanceRecordId)
  const updateMutation = useUpdateMaintenanceRecordPart(maintenanceRecordId)
  const deleteMutation = useDeleteMaintenanceRecordPart(maintenanceRecordId)

  const rows = partsQuery.data ?? []
  const total = rows.reduce((sum, r) => sum + Number(r.quantity) * Number(r.unit_cost ?? 0), 0)

  if (partsQuery.isLoading) {
    return (
      <div className="py-4">
        <Skeleton className="h-16" />
      </div>
    )
  }

  return (
    <div className="py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">Refacciones usadas en este servicio.</p>
        <Can permission="maintenance.manage">
          <div className="w-64">
            <RelationSelect
              value={null}
              displayLabel={null}
              placeholder="Agregar refacción…"
              onSearch={(query) =>
                searchParts(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.name })))
              }
              onSelect={(option) => {
                if (option) createMutation.mutate({ part_id: option.id, quantity: 1 })
              }}
            />
          </div>
        </Can>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Sin refacciones" description="Agrega las refacciones que se usaron en este servicio." />
      ) : (
        <>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-2 py-2">Refacción</th>
                <th className="px-2 py-2">Cantidad</th>
                <th className="px-2 py-2">Costo unitario</th>
                <th className="px-2 py-2">Total</th>
                <th className="px-2 py-2">Notas</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <PartRow
                  key={row.id}
                  row={row}
                  onSave={(input) => updateMutation.mutate({ id: row.id, input })}
                  onDelete={() => deleteMutation.mutate(row.id)}
                  deleting={deleteMutation.isPending && deleteMutation.variables === row.id}
                />
              ))}
            </tbody>
          </table>
          <div className="mt-3 text-xs text-gray-500">
            Total: <strong className="text-gray-700">{formatCurrency(total)}</strong>
          </div>
        </>
      )}
    </div>
  )
}
