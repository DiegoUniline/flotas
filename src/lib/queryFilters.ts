export type FilterFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean'

export interface FilterFieldOption {
  value: string
  label: string
}

export interface FilterFieldDef {
  key: string
  label: string
  type: FilterFieldType
  /** Requerido cuando type === 'select'. */
  options?: FilterFieldOption[]
}

export interface GroupFieldDef {
  key: string
  label: string
}

export type FilterOperator = 'contains' | 'equals' | 'gt' | 'gte' | 'lt' | 'lte' | 'is'

export interface AppliedFilter {
  id: string
  field: FilterFieldDef
  operator: FilterOperator
  value: string
}

export const OPERATORS_BY_TYPE: Record<FilterFieldType, { value: FilterOperator; label: string }[]> = {
  text: [
    { value: 'contains', label: 'contiene' },
    { value: 'equals', label: 'es igual a' },
  ],
  number: [
    { value: 'equals', label: '=' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '≥' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '≤' },
  ],
  date: [
    { value: 'equals', label: 'es' },
    { value: 'gt', label: 'después de' },
    { value: 'lt', label: 'antes de' },
  ],
  select: [{ value: 'equals', label: 'es' }],
  boolean: [{ value: 'is', label: 'es' }],
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

// Tipo laxo a propósito: el query builder de supabase-js es genérico por
// tabla y encadenar filtros dinámicos con seguridad total de tipos no vale
// la complejidad para este helper interno.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyFilters<Q>(query: Q, filters: AppliedFilter[]): Q {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result = query as any
  for (const filter of filters) {
    if (filter.value === '' || filter.value == null) continue
    const column = filter.field.key
    const numericValue = Number(filter.value)

    switch (filter.operator) {
      case 'contains':
        result = result.ilike(column, `%${escapeIlikeTerm(filter.value)}%`)
        break
      case 'equals':
        result = result.eq(column, filter.field.type === 'number' ? numericValue : filter.value)
        break
      case 'gt':
        result = result.gt(column, filter.field.type === 'number' ? numericValue : filter.value)
        break
      case 'gte':
        result = result.gte(column, filter.field.type === 'number' ? numericValue : filter.value)
        break
      case 'lt':
        result = result.lt(column, filter.field.type === 'number' ? numericValue : filter.value)
        break
      case 'lte':
        result = result.lte(column, filter.field.type === 'number' ? numericValue : filter.value)
        break
      case 'is':
        result = result.eq(column, filter.value === 'true')
        break
    }
  }
  return result as Q
}
