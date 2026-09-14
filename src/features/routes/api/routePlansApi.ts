import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type RoutePlan = Tables<'route_plans'>
export type RoutePlanInsert = Omit<TablesInsert<'route_plans'>, 'organization_id' | 'created_by'>
export type RoutePlanUpdate = TablesUpdate<'route_plans'>

export interface RoutePlanWithRelations extends RoutePlan {
  drivers: { first_name: string; last_name: string } | null
  vehicles: { economic_number: string | null; plate: string | null } | null
}

export const ROUTE_STATUSES = [
  { value: 'draft', label: 'Borrador' },
  { value: 'planned', label: 'Planeada' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
] as const

export interface RoutePlanFilters {
  scheduledDate: string | null
  status: string | null
}

const ROUTE_PLAN_SELECT = '*, drivers(first_name, last_name), vehicles(economic_number, plate)'

export async function fetchRoutePlans(
  organizationId: string,
  filters: RoutePlanFilters,
): Promise<RoutePlanWithRelations[]> {
  let query = supabase
    .from('route_plans')
    .select(ROUTE_PLAN_SELECT)
    .eq('organization_id', organizationId)

  if (filters.scheduledDate) {
    query = query.eq('scheduled_date', filters.scheduledDate)
  }
  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query.order('scheduled_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as RoutePlanWithRelations[]
}

export async function fetchRoutePlanById(id: string): Promise<RoutePlanWithRelations> {
  const { data, error } = await supabase.from('route_plans').select(ROUTE_PLAN_SELECT).eq('id', id).single()
  if (error) throw error
  return data as unknown as RoutePlanWithRelations
}

export async function createRoutePlan(organizationId: string, input: RoutePlanInsert): Promise<RoutePlan> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('route_plans')
    .insert({ ...input, organization_id: organizationId, created_by: user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRoutePlan(id: string, input: RoutePlanUpdate): Promise<RoutePlan> {
  const { data, error } = await supabase.from('route_plans').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}
