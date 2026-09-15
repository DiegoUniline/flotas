import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import { queryClient } from '@/lib/queryClient'
import { offlineSyncKeys } from '@/lib/offlineCache'

export type CustomerLocation = Tables<'customer_locations'>
export type CustomerLocationInsert = Omit<TablesInsert<'customer_locations'>, 'organization_id' | 'customer_id'>
export type CustomerLocationUpdate = TablesUpdate<'customer_locations'>

export async function fetchCustomerLocations(customerId: string): Promise<CustomerLocation[]> {
  const { data, error } = await supabase
    .from('customer_locations')
    .select('*')
    .eq('customer_id', customerId)
    .eq('active', true)
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createCustomerLocation(
  organizationId: string,
  customerId: string,
  input: CustomerLocationInsert,
): Promise<CustomerLocation> {
  const { data, error } = await supabase
    .from('customer_locations')
    .insert({ ...input, organization_id: organizationId, customer_id: customerId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCustomerLocation(id: string, input: CustomerLocationUpdate): Promise<CustomerLocation> {
  const { data, error } = await supabase.from('customer_locations').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteCustomerLocation(id: string): Promise<void> {
  const { error } = await supabase.from('customer_locations').update({ active: false }).eq('id', id)
  if (error) throw error
}

export interface CustomerLocationOption {
  id: string
  name: string
  address: string | null
}

export async function fetchCustomerLocationOptions(customerId: string): Promise<CustomerLocationOption[]> {
  const { data, error } = await supabase
    .from('customer_locations')
    .select('id, name, address')
    .eq('customer_id', customerId)
    .eq('active', true)
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

interface CustomerLocationOptionWithCustomer extends CustomerLocationOption {
  customer_id: string
}

/** Todos los domicilios de todos los clientes de la organización, en una
 * sola query — usado por "Sincronizar mis datos"
 * (`features/offlineSync`), no por la ficha de un cliente (que sigue
 * usando `fetchCustomerLocationOptions`, acotada a un solo cliente). */
export async function fetchAllCustomerLocationsForOrg(organizationId: string): Promise<CustomerLocationOptionWithCustomer[]> {
  const { data, error } = await supabase
    .from('customer_locations')
    .select('id, name, address, customer_id')
    .eq('organization_id', organizationId)
    .eq('active', true)
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function searchCustomerLocations(organizationId: string, customerId: string, query: string): Promise<CustomerLocationOption[]> {
  if (navigator.onLine) {
    try {
      let q = supabase.from('customer_locations').select('id, name, address').eq('customer_id', customerId).eq('active', true)
      if (query.trim()) q = q.ilike('name', `%${query.trim()}%`)
      const { data, error } = await q.order('name', { ascending: true }).limit(20)
      if (error) throw error
      return data ?? []
    } catch {
      // sigue al respaldo sin conexión de abajo
    }
  }

  const cached =
    (queryClient.getQueryData(offlineSyncKeys.customerLocations(organizationId)) as CustomerLocationOptionWithCustomer[] | undefined) ?? []
  const term = query.trim().toLowerCase()
  return cached
    .filter((item) => item.customer_id === customerId && (!term || item.name.toLowerCase().includes(term)))
    .slice(0, 20)
}
