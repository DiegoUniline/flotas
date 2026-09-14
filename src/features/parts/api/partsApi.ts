import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import { applyFilters, type AppliedFilter } from '@/lib/queryFilters'
import type { DateRangeValue } from '@/lib/dateRanges'

export type Part = Tables<'parts'>
export type PartInsert = Omit<TablesInsert<'parts'>, 'organization_id'>
export type PartUpdate = TablesUpdate<'parts'>

export const PART_UNITS = [
  { value: 'pza', label: 'Pieza' },
  { value: 'lt', label: 'Litro' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'juego', label: 'Juego' },
] as const

export type PartSortColumn = 'name' | 'quantity_on_hand' | 'unit_cost' | 'created_at'

export interface PartFilters {
  search: string
  dateRange: DateRangeValue
  advanced: AppliedFilter[]
  groupBy: string | null
}

export interface PartSort {
  column: PartSortColumn
  direction: 'asc' | 'desc'
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

const GROUPED_PAGE_SIZE = 300

export async function fetchParts(
  organizationId: string,
  filters: PartFilters,
  sort: PartSort,
  page: number,
  pageSize: number,
): Promise<{ rows: Part[]; count: number }> {
  let query = supabase.from('parts').select('*', { count: 'exact' }).eq('organization_id', organizationId).is('deleted_at', null)

  const search = escapeIlikeTerm(filters.search)
  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
  }
  if (filters.dateRange.from) query = query.gte('created_at', filters.dateRange.from)
  if (filters.dateRange.to) query = query.lte('created_at', `${filters.dateRange.to}T23:59:59`)

  query = applyFilters(query, filters.advanced)

  const effectivePageSize = filters.groupBy ? GROUPED_PAGE_SIZE : pageSize
  const effectivePage = filters.groupBy ? 0 : page
  const from = effectivePage * effectivePageSize
  const to = from + effectivePageSize - 1

  const orderColumn = filters.groupBy ?? sort.column
  query = query.order(orderColumn, { ascending: true }).range(from, to)
  if (filters.groupBy) {
    query = query.order(sort.column, { ascending: sort.direction === 'asc' })
  }

  const { data, error, count } = await query
  if (error) throw error
  return { rows: data ?? [], count: count ?? 0 }
}

export async function fetchPartById(id: string): Promise<Part> {
  const { data, error } = await supabase.from('parts').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export interface PartOption {
  id: string
  name: string
  unit: string
  unit_cost: number | null
}

export async function searchParts(organizationId: string, query: string): Promise<PartOption[]> {
  let q = supabase
    .from('parts')
    .select('id, name, unit, unit_cost')
    .eq('organization_id', organizationId)
    .eq('active', true)
    .is('deleted_at', null)

  if (query.trim()) q = q.or(`name.ilike.%${query.trim()}%,sku.ilike.%${query.trim()}%`)
  const { data, error } = await q.order('name', { ascending: true }).limit(20)
  if (error) throw error
  return data ?? []
}

export async function createPart(organizationId: string, input: PartInsert): Promise<Part> {
  const { data, error } = await supabase
    .from('parts')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePart(id: string, input: PartUpdate): Promise<Part> {
  const { data, error } = await supabase.from('parts').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function softDeletePart(id: string): Promise<void> {
  const { error } = await supabase.from('parts').update({ deleted_at: new Date().toISOString(), active: false }).eq('id', id)
  if (error) throw error
}
