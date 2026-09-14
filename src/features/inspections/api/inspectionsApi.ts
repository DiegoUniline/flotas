import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import { applyFilters, type AppliedFilter } from '@/lib/queryFilters'
import type { DateRangeValue } from '@/lib/dateRanges'

export type Inspection = Tables<'inspections'>
export type InspectionInsert = Omit<TablesInsert<'inspections'>, 'organization_id'>
export type InspectionUpdate = TablesUpdate<'inspections'>

export interface InspectionWithRelations extends Inspection {
  vehicles: { economic_number: string; plate: string | null } | null
  drivers: { first_name: string; last_name: string } | null
  inspection_templates: { name: string } | null
}

export const INSPECTION_RESULTS = [
  { value: 'pass', label: 'Aprobada' },
  { value: 'fail', label: 'Con problemas' },
] as const

export type InspectionSortColumn = 'performed_at' | 'created_at'

export interface InspectionFilters {
  search: string
  dateRange: DateRangeValue
  advanced: AppliedFilter[]
  groupBy: string | null
}

export interface InspectionSort {
  column: InspectionSortColumn
  direction: 'asc' | 'desc'
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

const INSPECTION_SELECT = '*, vehicles(economic_number, plate), drivers(first_name, last_name), inspection_templates(name)'
const GROUPED_PAGE_SIZE = 300

export async function fetchInspections(
  organizationId: string,
  filters: InspectionFilters,
  sort: InspectionSort,
  page: number,
  pageSize: number,
): Promise<{ rows: InspectionWithRelations[]; count: number }> {
  let query = supabase
    .from('inspections')
    .select(INSPECTION_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  const search = escapeIlikeTerm(filters.search)
  if (search) {
    query = query.ilike('notes', `%${search}%`)
  }
  if (filters.dateRange.from) query = query.gte('performed_at', filters.dateRange.from)
  if (filters.dateRange.to) query = query.lte('performed_at', `${filters.dateRange.to}T23:59:59`)

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
  return { rows: (data ?? []) as unknown as InspectionWithRelations[], count: count ?? 0 }
}

export async function fetchInspectionById(id: string): Promise<InspectionWithRelations> {
  const { data, error } = await supabase.from('inspections').select(INSPECTION_SELECT).eq('id', id).single()
  if (error) throw error
  return data as unknown as InspectionWithRelations
}

export async function createInspection(organizationId: string, input: InspectionInsert): Promise<Inspection> {
  const { data, error } = await supabase
    .from('inspections')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateInspection(id: string, input: InspectionUpdate): Promise<Inspection> {
  const { data, error } = await supabase.from('inspections').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function softDeleteInspection(id: string): Promise<void> {
  const { error } = await supabase.from('inspections').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
