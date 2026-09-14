import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database'

export type InspectionTemplateItem = Tables<'inspection_template_items'>
export type InspectionTemplateItemUpdate = TablesUpdate<'inspection_template_items'>

export async function fetchInspectionTemplateItems(templateId: string): Promise<InspectionTemplateItem[]> {
  const { data, error } = await supabase
    .from('inspection_template_items')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createInspectionTemplateItem(
  organizationId: string,
  templateId: string,
  label: string,
  sortOrder: number,
): Promise<InspectionTemplateItem> {
  const { data, error } = await supabase
    .from('inspection_template_items')
    .insert({ organization_id: organizationId, template_id: templateId, label, sort_order: sortOrder })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateInspectionTemplateItem(id: string, input: InspectionTemplateItemUpdate): Promise<InspectionTemplateItem> {
  const { data, error } = await supabase.from('inspection_template_items').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteInspectionTemplateItem(id: string): Promise<void> {
  const { error } = await supabase.from('inspection_template_items').delete().eq('id', id)
  if (error) throw error
}
