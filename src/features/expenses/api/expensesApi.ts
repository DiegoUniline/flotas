import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import { applyFilters, type AppliedFilter } from '@/lib/queryFilters'
import type { DateRangeValue } from '@/lib/dateRanges'

export type Expense = Tables<'expenses'>
export type ExpenseInsert = Omit<TablesInsert<'expenses'>, 'organization_id' | 'status' | 'approved_by' | 'approved_at'>
export type ExpenseUpdate = Omit<TablesUpdate<'expenses'>, 'status' | 'approved_by' | 'approved_at'>

export interface ExpenseWithRelations extends Expense {
  vehicles: { economic_number: string; plate: string | null } | null
  drivers: { first_name: string; last_name: string } | null
}

/** Texto libre, no enum de Postgres — mismo criterio que el resto del esquema. */
export const EXPENSE_CATEGORIES = [
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'tolls', label: 'Casetas' },
  { value: 'parking', label: 'Estacionamiento' },
  { value: 'fines', label: 'Multas' },
  { value: 'insurance', label: 'Seguros' },
  { value: 'permits', label: 'Permisos y trámites' },
  { value: 'other', label: 'Otro' },
] as const

export const EXPENSE_STATUSES = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'approved', label: 'Aprobado' },
  { value: 'rejected', label: 'Rechazado' },
] as const

export type ExpenseSortColumn = 'expense_date' | 'amount' | 'created_at'

export interface ExpenseFilters {
  search: string
  dateRange: DateRangeValue
  advanced: AppliedFilter[]
  groupBy: string | null
}

export interface ExpenseSort {
  column: ExpenseSortColumn
  direction: 'asc' | 'desc'
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

const EXPENSE_SELECT = '*, vehicles(economic_number, plate), drivers(first_name, last_name)'
const GROUPED_PAGE_SIZE = 300

export async function fetchExpenses(
  organizationId: string,
  filters: ExpenseFilters,
  sort: ExpenseSort,
  page: number,
  pageSize: number,
): Promise<{ rows: ExpenseWithRelations[]; count: number }> {
  let query = supabase
    .from('expenses')
    .select(EXPENSE_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  const search = escapeIlikeTerm(filters.search)
  if (search) {
    query = query.ilike('description', `%${search}%`)
  }
  if (filters.dateRange.from) query = query.gte('expense_date', filters.dateRange.from)
  if (filters.dateRange.to) query = query.lte('expense_date', filters.dateRange.to)

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
  return { rows: (data ?? []) as unknown as ExpenseWithRelations[], count: count ?? 0 }
}

export async function fetchExpenseById(id: string): Promise<ExpenseWithRelations> {
  const { data, error } = await supabase.from('expenses').select(EXPENSE_SELECT).eq('id', id).single()
  if (error) throw error
  return data as unknown as ExpenseWithRelations
}

export async function createExpense(organizationId: string, input: ExpenseInsert): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateExpense(id: string, input: ExpenseUpdate): Promise<Expense> {
  const { data, error } = await supabase.from('expenses').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function softDeleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function setExpenseStatus(id: string, status: 'pending' | 'approved' | 'rejected'): Promise<Expense> {
  const { data, error } = await supabase.rpc('set_expense_status', { p_expense_id: id, p_status: status })
  if (error) throw error
  return data as Expense
}
