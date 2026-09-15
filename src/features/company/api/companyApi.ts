import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database'

export type CompanyOrganization = Tables<'organizations'>
export type CompanyOrganizationUpdate = TablesUpdate<'organizations'>

export async function fetchOrganizationById(id: string): Promise<CompanyOrganization> {
  const { data, error } = await supabase.from('organizations').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function updateOrganization(id: string, input: CompanyOrganizationUpdate): Promise<CompanyOrganization> {
  const { data, error } = await supabase.from('organizations').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}
