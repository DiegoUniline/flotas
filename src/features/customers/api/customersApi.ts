import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

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
  status: string | null
}

export interface CustomerSort {
  column: CustomerSortColumn
  direction: 'asc' | 'desc'
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

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
  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const from = page * pageSize
  const to = from + pageSize - 1
  query = query.order(sort.column, { ascending: sort.direction === 'asc' }).range(from, to)

  const { data, error, count } = await query
  if (error) throw error
  return { rows: data ?? [], count: count ?? 0 }
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
