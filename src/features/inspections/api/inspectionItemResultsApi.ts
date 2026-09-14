import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type InspectionItemResult = Tables<'inspection_item_results'>

export interface InspectionItemResultWithLabel extends InspectionItemResult {
  inspection_template_items: { label: string; sort_order: number } | null
}

export async function fetchInspectionItemResults(inspectionId: string): Promise<InspectionItemResultWithLabel[]> {
  const { data, error } = await supabase
    .from('inspection_item_results')
    .select('*, inspection_template_items(label, sort_order)')
    .eq('inspection_id', inspectionId)
  if (error) throw error
  const rows = (data ?? []) as unknown as InspectionItemResultWithLabel[]
  return rows.sort((a, b) => (a.inspection_template_items?.sort_order ?? 0) - (b.inspection_template_items?.sort_order ?? 0))
}

export interface ItemResultInput {
  template_item_id: string
  result: string
  notes: string | null
}

/** Guarda todos los resultados del checklist de una inspección de una sola
 * vez — se llama tanto al crear (no existen filas todavía) como al editar
 * (ya existen, se actualizan por `template_item_id`). No hay upsert nativo
 * cómodo desde supabase-js con constraint compuesta simple aquí, así que se
 * resuelve explícito: trae lo existente, actualiza lo que ya hay e inserta
 * lo que falta. */
export async function saveInspectionItemResults(
  organizationId: string,
  inspectionId: string,
  items: ItemResultInput[],
): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from('inspection_item_results')
    .select('id, template_item_id')
    .eq('inspection_id', inspectionId)
  if (fetchError) throw fetchError

  const existingByItem = new Map((existing ?? []).map((row) => [row.template_item_id, row.id]))

  const toInsert = items
    .filter((item) => !existingByItem.has(item.template_item_id))
    .map((item) => ({
      organization_id: organizationId,
      inspection_id: inspectionId,
      template_item_id: item.template_item_id,
      result: item.result,
      notes: item.notes,
    }))

  const toUpdate = items.filter((item) => existingByItem.has(item.template_item_id))

  if (toInsert.length > 0) {
    const { error } = await supabase.from('inspection_item_results').insert(toInsert)
    if (error) throw error
  }

  for (const item of toUpdate) {
    const id = existingByItem.get(item.template_item_id)!
    const { error } = await supabase.from('inspection_item_results').update({ result: item.result, notes: item.notes }).eq('id', id)
    if (error) throw error
  }
}
