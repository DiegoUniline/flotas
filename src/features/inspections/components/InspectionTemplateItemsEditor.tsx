import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  useCreateInspectionTemplateItem,
  useDeleteInspectionTemplateItem,
  useInspectionTemplateItems,
  useUpdateInspectionTemplateItem,
} from '@/features/inspections/hooks/useInspectionTemplateItems'

const CELL_INPUT_CLASSNAME =
  'w-full border-0 border-b-2 border-transparent bg-transparent px-1.5 py-1 text-sm text-gray-900 transition-colors hover:border-gray-200 focus:border-accent-500 focus:outline-none'

export function InspectionTemplateItemsEditor({ templateId }: { templateId: string }) {
  const itemsQuery = useInspectionTemplateItems(templateId)
  const createMutation = useCreateInspectionTemplateItem(templateId)
  const updateMutation = useUpdateInspectionTemplateItem(templateId)
  const deleteMutation = useDeleteInspectionTemplateItem(templateId)
  const [newLabel, setNewLabel] = useState('')

  const items = itemsQuery.data ?? []

  function handleAdd() {
    if (!newLabel.trim()) return
    const nextOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0
    createMutation.mutate({ label: newLabel.trim(), sortOrder: nextOrder })
    setNewLabel('')
  }

  function move(index: number, direction: -1 | 1) {
    const target = items[index + direction]
    const current = items[index]
    if (!target || !current) return
    updateMutation.mutate({ id: current.id, input: { sort_order: target.sort_order } })
    updateMutation.mutate({ id: target.id, input: { sort_order: current.sort_order } })
  }

  if (itemsQuery.isLoading) {
    return (
      <div className="py-4">
        <Skeleton className="h-24" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <EmptyState title="Sin ítems" description="Agrega los puntos que se revisan en esta inspección." />
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1">
              <div className="flex flex-col">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30">
                  <ArrowUp size={13} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                >
                  <ArrowDown size={13} strokeWidth={2} />
                </button>
              </div>
              <input
                defaultValue={item.label}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== item.label) {
                    updateMutation.mutate({ id: item.id, input: { label: e.target.value.trim() } })
                  }
                }}
                className={CELL_INPUT_CLASSNAME}
              />
              <button
                type="button"
                onClick={() => deleteMutation.mutate(item.id)}
                disabled={deleteMutation.isPending && deleteMutation.variables === item.id}
                className="shrink-0 text-gray-400 hover:text-red-600 disabled:opacity-40"
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
          placeholder="Nuevo punto a revisar…"
          className="flex-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newLabel.trim() || createMutation.isPending}
          className="flex shrink-0 items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          <Plus size={14} strokeWidth={2} />
          Agregar
        </button>
      </div>
    </div>
  )
}
