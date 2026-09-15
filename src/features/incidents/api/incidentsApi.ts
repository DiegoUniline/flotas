import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import { applyFilters, type AppliedFilter } from '@/lib/queryFilters'
import type { DateRangeValue } from '@/lib/dateRanges'

export type Incident = Tables<'incidents'>
export type IncidentInsert = Omit<TablesInsert<'incidents'>, 'organization_id'>
export type IncidentUpdate = TablesUpdate<'incidents'>

export interface IncidentWithRelations extends Incident {
  vehicles: { economic_number: string; plate: string | null } | null
  drivers: { first_name: string; last_name: string } | null
}

/** Texto libre, no enum de Postgres — mismo criterio que `vehicles.status`/`devices.device_type`. */
export const INCIDENT_TYPES = [
  { value: 'accident', label: 'Accidente' },
  { value: 'breakdown', label: 'Descompostura' },
  { value: 'infraction', label: 'Infracción' },
  { value: 'theft', label: 'Robo' },
  { value: 'other', label: 'Otro' },
] as const

export const INCIDENT_SEVERITIES = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
] as const

export const INCIDENT_STATUSES = [
  { value: 'open', label: 'Abierto' },
  { value: 'resolved', label: 'Resuelto' },
] as const

export type IncidentSortColumn = 'incident_date' | 'severity' | 'status' | 'created_at'

export interface IncidentFilters {
  search: string
  dateRange: DateRangeValue
  advanced: AppliedFilter[]
  groupBy: string | null
}

export interface IncidentSort {
  column: IncidentSortColumn
  direction: 'asc' | 'desc'
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

const INCIDENT_SELECT = '*, vehicles(economic_number, plate), drivers(first_name, last_name)'
const GROUPED_PAGE_SIZE = 300

export async function fetchIncidents(
  organizationId: string,
  filters: IncidentFilters,
  sort: IncidentSort,
  page: number,
  pageSize: number,
): Promise<{ rows: IncidentWithRelations[]; count: number }> {
  let query = supabase
    .from('incidents')
    .select(INCIDENT_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  const search = escapeIlikeTerm(filters.search)
  if (search) {
    query = query.or(`description.ilike.%${search}%,location.ilike.%${search}%`)
  }
  if (filters.dateRange.from) query = query.gte('incident_date', filters.dateRange.from)
  if (filters.dateRange.to) query = query.lte('incident_date', filters.dateRange.to)

  query = applyFilters(query, filters.advanced)

  const effectivePageSize = filters.groupBy ? GROUPED_PAGE_SIZE : pageSize
  const effectivePage = filters.groupBy ? 0 : page
  const from = effectivePage * effectivePageSize
  const to = from + effectivePageSize - 1

  const orderColumn = filters.groupBy ?? sort.column
  query = query.order(orderColumn, { ascending: filters.groupBy ? true : sort.direction === 'asc' }).range(from, to)
  if (filters.groupBy) {
    query = query.order(sort.column, { ascending: sort.direction === 'asc' })
  }

  const { data, error, count } = await query
  if (error) throw error
  return { rows: (data ?? []) as unknown as IncidentWithRelations[], count: count ?? 0 }
}

export async function fetchIncidentById(id: string): Promise<IncidentWithRelations> {
  const { data, error } = await supabase.from('incidents').select(INCIDENT_SELECT).eq('id', id).single()
  if (error) throw error
  return data as unknown as IncidentWithRelations
}

export async function createIncident(organizationId: string, input: IncidentInsert): Promise<Incident> {
  const { data, error } = await supabase
    .from('incidents')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateIncident(id: string, input: IncidentUpdate): Promise<Incident> {
  const { data, error } = await supabase.from('incidents').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function softDeleteIncident(id: string): Promise<void> {
  const { error } = await supabase.from('incidents').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Conteo real de incidentes abiertos — reutilizado por el módulo Alertas
 * (no se duplica la query, `alertsApi.ts` importa de aquí). */
export async function fetchOpenIncidentsCount(organizationId: string): Promise<number> {
  const { count, error } = await supabase
    .from('incidents')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'open')
    .is('deleted_at', null)
  if (error) throw error
  return count ?? 0
}

export interface OpenIncidentRow {
  id: string
  incident_date: string
  incident_type: string
  severity: string
  description: string | null
  vehicles: { economic_number: string; plate: string | null } | null
}

/** Lista real de incidentes abiertos, para el detalle del módulo Alertas. */
export async function fetchOpenIncidents(organizationId: string, limit = 50): Promise<OpenIncidentRow[]> {
  const { data, error } = await supabase
    .from('incidents')
    .select('id, incident_date, incident_type, severity, description, vehicles(economic_number, plate)')
    .eq('organization_id', organizationId)
    .eq('status', 'open')
    .is('deleted_at', null)
    .order('incident_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as unknown as OpenIncidentRow[]
}
