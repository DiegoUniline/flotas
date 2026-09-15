import { Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { DateRangeFilter } from './DateRangeFilter'
import { FilterPanel } from './FilterPanel'
import type { DateRangeValue } from '@/lib/dateRanges'
import type { AppliedFilter, FilterFieldDef, GroupFieldDef } from '@/lib/queryFilters'

interface ListToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  dateRange?: DateRangeValue
  onDateRangeChange?: (value: DateRangeValue) => void
  filters: AppliedFilter[]
  onFiltersChange: (filters: AppliedFilter[]) => void
  filterFields: FilterFieldDef[]
  groupFields?: GroupFieldDef[]
  groupBy?: string | null
  onGroupByChange?: (key: string | null) => void
  trailing?: ReactNode
}

export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  dateRange,
  onDateRangeChange,
  filters,
  onFiltersChange,
  filterFields,
  groupFields,
  groupBy,
  onGroupByChange,
  trailing,
}: ListToolbarProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* En celular la fecha/filtros/trailing quedan en su fila y el
          buscador se va solo a la siguiente (basis-full + order-last) —
          apretarlos todos en una sola fila de ~375px de ancho lo dejaría
          ilegible. Desde `sm:` vuelve a ser una sola fila, como siempre. */}
      <div className="flex flex-wrap items-center gap-2">
        {dateRange && onDateRangeChange && <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />}
        <div className="relative order-last min-w-0 flex-1 basis-full sm:order-none sm:basis-0">
          <Search size={15} strokeWidth={2} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-md border border-gray-300 py-2.5 pl-8 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Limpiar búsqueda"
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}
        </div>
        <FilterPanel
          fields={filterFields}
          groupFields={groupFields}
          filters={filters}
          onFiltersChange={onFiltersChange}
          groupBy={groupBy}
          onGroupByChange={onGroupByChange}
        />
        {trailing}
      </div>

      {(filters.length > 0 || groupBy) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((filter) => (
            <span key={filter.id} className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
              {filter.field.label} {filter.value}
              <button
                type="button"
                onClick={() => onFiltersChange(filters.filter((f) => f.id !== filter.id))}
                className="-m-1 rounded-full p-1 text-gray-400 hover:text-gray-700"
              >
                <X size={11} strokeWidth={2} />
              </button>
            </span>
          ))}
          {groupBy && groupFields && (
            <span className="flex items-center gap-1 rounded-full bg-accent-50 px-2.5 py-1 text-xs text-accent-600">
              Agrupado por {groupFields.find((g) => g.key === groupBy)?.label ?? groupBy}
              <button type="button" onClick={() => onGroupByChange?.(null)} className="-m-1 rounded-full p-1 text-accent-400 hover:text-accent-700">
                <X size={11} strokeWidth={2} />
              </button>
            </span>
          )}
          {(filters.length > 0 || groupBy) && (
            <button
              type="button"
              onClick={() => {
                onFiltersChange([])
                onGroupByChange?.(null)
              }}
              className="-my-1 rounded px-1 py-1 text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              Limpiar todo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
