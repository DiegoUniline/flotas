import { useRef, useState } from 'react'
import { ChevronDown, Plus, SlidersHorizontal, X } from 'lucide-react'
import { useClickOutside } from '@/hooks/useClickOutside'
import { BottomSheet } from './BottomSheet'
import { OPERATORS_BY_TYPE, type AppliedFilter, type FilterFieldDef, type GroupFieldDef } from '@/lib/queryFilters'

interface FilterPanelProps {
  fields: FilterFieldDef[]
  groupFields?: GroupFieldDef[]
  filters: AppliedFilter[]
  onFiltersChange: (filters: AppliedFilter[]) => void
  groupBy?: string | null
  onGroupByChange?: (key: string | null) => void
}

let nextFilterId = 1

function blankFilter(field: FilterFieldDef): AppliedFilter {
  return {
    id: String(nextFilterId++),
    field,
    operator: OPERATORS_BY_TYPE[field.type][0].value,
    value: '',
  }
}

const CONTROL_CLASSNAME = 'min-h-9 rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-900 focus:border-accent-500 focus:outline-none'

export function FilterPanel({ fields, groupFields = [], filters, onFiltersChange, groupBy, onGroupByChange }: FilterPanelProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setOpen(false), open)

  const activeCount = filters.length + (groupBy ? 1 : 0)

  function updateFilter(id: string, patch: Partial<AppliedFilter>) {
    onFiltersChange(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  function removeFilter(id: string) {
    onFiltersChange(filters.filter((f) => f.id !== id))
  }

  function addFilter() {
    if (fields.length === 0) return
    onFiltersChange([...filters, blankFilter(fields[0])])
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 items-center gap-1.5 rounded-md border border-gray-300 bg-surface px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        <SlidersHorizontal size={14} strokeWidth={2} className="text-gray-400" />
        Filtros
        {activeCount > 0 && (
          <span className="rounded-full bg-accent-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">{activeCount}</span>
        )}
        <ChevronDown size={14} strokeWidth={2} className="text-gray-400" />
      </button>

      {/* Extraído a `BottomSheet` (hoja fija al fondo en celular, popover
          anclado desde `sm:`) — mismo patrón, ahora compartido con cualquier
          otro selector corto del proyecto. */}
      <BottomSheet open={open} title="Filtros" onClose={() => setOpen(false)} anchorClassName="sm:right-0 sm:w-96">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Filtros por campos</p>
            <div className="flex flex-col gap-2">
              {filters.map((filter) => (
                <div key={filter.id} className="flex items-center gap-1.5">
                  <select
                    value={filter.field.key}
                    onChange={(e) => {
                      const nextField = fields.find((f) => f.key === e.target.value)
                      if (nextField) updateFilter(filter.id, { field: nextField, operator: OPERATORS_BY_TYPE[nextField.type][0].value, value: '' })
                    }}
                    className={`${CONTROL_CLASSNAME} flex-1`}
                  >
                    {fields.map((field) => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(filter.id, { operator: e.target.value as AppliedFilter['operator'] })}
                    className={`${CONTROL_CLASSNAME} w-28`}
                  >
                    {OPERATORS_BY_TYPE[filter.field.type].map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                  {filter.field.type === 'select' ? (
                    <select
                      value={filter.value}
                      onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                      className={`${CONTROL_CLASSNAME} flex-1`}
                    >
                      <option value="">Selecciona</option>
                      {filter.field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : filter.field.type === 'boolean' ? (
                    <select
                      value={filter.value}
                      onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                      className={`${CONTROL_CLASSNAME} flex-1`}
                    >
                      <option value="">Selecciona</option>
                      <option value="true">Sí</option>
                      <option value="false">No</option>
                    </select>
                  ) : (
                    <input
                      type={filter.field.type === 'number' ? 'number' : filter.field.type === 'date' ? 'date' : 'text'}
                      value={filter.value}
                      onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                      className={`${CONTROL_CLASSNAME} flex-1`}
                    />
                  )}
                  <button type="button" onClick={() => removeFilter(filter.id)} className="-m-1 rounded p-1 text-gray-400 hover:text-red-600">
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addFilter}
              className="-ml-1.5 mt-1 flex items-center gap-1 rounded px-1.5 py-1.5 text-xs font-medium text-accent-600 hover:text-accent-700"
            >
              <Plus size={13} strokeWidth={2} />
              Agregar filtro
            </button>
          </div>

          {groupFields.length > 0 && onGroupByChange && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Agrupar por</p>
              <div className="flex flex-wrap gap-1.5">
                {groupFields.map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => onGroupByChange(groupBy === group.key ? null : group.key)}
                    className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium ${
                      groupBy === group.key
                        ? 'border-accent-500 bg-accent-50 text-accent-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
            </div>
          )}
      </BottomSheet>
    </div>
  )
}
