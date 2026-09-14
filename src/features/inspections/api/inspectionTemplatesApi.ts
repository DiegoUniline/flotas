import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type InspectionTemplate = Tables<'inspection_templates'>
export type InspectionTemplateInsert = Omit<TablesInsert<'inspection_templates'>, 'organization_id'>
export type InspectionTemplateUpdate = TablesUpdate<'inspection_templates'>

export async function fetchInspectionTemplates(organizationId: string): Promise<InspectionTemplate[]> {
  const { data, error } = await supabase
    .from('inspection_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function fetchInspectionTemplateById(id: string): Promise<InspectionTemplate> {
  const { data, error } = await supabase.from('inspection_templates').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export interface InspectionTemplateOption {
  id: string
  name: string
}

export async function searchInspectionTemplates(organizationId: string, query: string): Promise<InspectionTemplateOption[]> {
  let q = supabase.from('inspection_templates').select('id, name').eq('organization_id', organizationId).eq('active', true).is('deleted_at', null)
  if (query.trim()) q = q.ilike('name', `%${query.trim()}%`)
  const { data, error } = await q.order('name', { ascending: true }).limit(20)
  if (error) throw error
  return data ?? []
}

export async function createInspectionTemplate(organizationId: string, input: InspectionTemplateInsert): Promise<InspectionTemplate> {
  const { data, error } = await supabase
    .from('inspection_templates')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateInspectionTemplate(id: string, input: InspectionTemplateUpdate): Promise<InspectionTemplate> {
  const { data, error } = await supabase.from('inspection_templates').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function softDeleteInspectionTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('inspection_templates').update({ deleted_at: new Date().toISOString(), active: false }).eq('id', id)
  if (error) throw error
}
