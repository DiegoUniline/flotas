import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import { applyFilters, type AppliedFilter } from '@/lib/queryFilters'
import type { DateRangeValue } from '@/lib/dateRanges'
import { offlineSyncKeys, searchWithOfflineFallback } from '@/lib/offlineCache'

export type Customer = Tables<'customers'>
export type CustomerInsert = Omit<TablesInsert<'customers'>, 'organization_id'>
export type CustomerUpdate = TablesUpdate<'customers'>

export const CUSTOMER_STATUSES = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
] as const

export type CustomerSortColumn = 'name' | 'code' | 'created_at'

export interface CustomerFilters {
  search: string
  dateRange: DateRangeValue
  advanced: AppliedFilter[]
  groupBy: string | null
}

export interface CustomerSort {
  column: CustomerSortColumn
  direction: 'asc' | 'desc'
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

const GROUPED_PAGE_SIZE = 300

export async function fetchCustomers(
  organizationId: string,
  filters: CustomerFilters,
  sort: CustomerSort,
  page: number,
  pageSize: number,
): Promise<{ rows: Customer[]; count: number }> {
  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  const search = escapeIlikeTerm(filters.search)
  if (search) {
    query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,phone.ilike.%${search}%`)
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

export async function fetchCustomerById(id: string): Promise<Customer> {
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createCustomer(organizationId: string, input: CustomerInsert): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCustomer(id: string, input: CustomerUpdate): Promise<Customer> {
  const { data, error } = await supabase.from('customers').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function softDeleteCustomer(id: string): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .update({ deleted_at: new Date().toISOString(), status: 'inactive' })
    .eq('id', id)
  if (error) throw error
}

export interface CustomerOption {
  id: string
  name: string
}

export async function fetchCustomerOptions(organizationId: string): Promise<CustomerOption[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function searchCustomers(organizationId: string, query: string): Promise<CustomerOption[]> {
  return searchWithOfflineFallback(
    offlineSyncKeys.customers(organizationId),
    (item: CustomerOption, term) => item.name.toLowerCase().includes(term),
    async () => {
      let q = supabase
        .from('customers')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .is('deleted_at', null)

      if (query.trim()) q = q.ilike('name', `%${query.trim()}%`)

      const { data, error } = await q.order('name', { ascending: true }).limit(20)
      if (error) throw error
      return data ?? []
    },
    query,
  )
}
