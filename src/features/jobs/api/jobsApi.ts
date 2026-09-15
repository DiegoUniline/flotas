import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import { applyFilters, type AppliedFilter } from '@/lib/queryFilters'
import type { DateRangeValue } from '@/lib/dateRanges'

export type Job = Tables<'jobs'>
export type JobInsert = Omit<TablesInsert<'jobs'>, 'organization_id' | 'created_by'>
export type JobUpdate = TablesUpdate<'jobs'>

export interface JobWithRelations extends Job {
  customers: { name: string } | null
  customer_locations: { name: string; address: string | null } | null
  origin_customer_locations: { name: string; address: string | null } | null
  origin_branch_locations: { name: string } | null
  drivers: { first_name: string; last_name: string } | null
  vehicles: { economic_number: string | null; plate: string | null } | null
}

export const JOB_TYPES = [
  { value: 'delivery', label: 'Entrega' },
  { value: 'pickup', label: 'Recolección' },
  { value: 'service', label: 'Servicio' },
  { value: 'other', label: 'Otro' },
] as const

export const JOB_STATUSES = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'en_route', label: 'En camino' },
  { value: 'arrived', label: 'Llegó' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'partial', label: 'Entrega parcial' },
  { value: 'not_delivered', label: 'No entregado' },
  { value: 'rejected', label: 'Rechazado' },
  { value: 'rescheduled', label: 'Reprogramado' },
] as const

export const JOB_PRIORITIES = [
  { value: 'low', label: 'Baja' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
] as const

export const ORIGIN_TYPES = [
  { value: 'pickup', label: 'Pasamos a recoger' },
  { value: 'branch', label: 'Lo entregan en sucursal' },
] as const

export type JobSortColumn = 'scheduled_date' | 'job_number' | 'created_at'

export interface JobFilters {
  search: string
  dateRange: DateRangeValue
  advanced: AppliedFilter[]
  groupBy: string | null
}

export interface JobSort {
  column: JobSortColumn
  direction: 'asc' | 'desc'
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').trim()
}

const JOB_SELECT_WITH_RELATIONS =
  '*, customers(name), customer_locations!jobs_customer_location_id_fkey(name, address), origin_customer_locations:customer_locations!jobs_origin_customer_location_id_fkey(name, address), origin_branch_locations:locations!jobs_origin_branch_location_id_fkey(name), drivers(first_name, last_name), vehicles(economic_number, plate)'

/** Cuando hay agrupación se trae un lote más grande para que los grupos no
 * queden cortados a la mitad entre páginas (mismo criterio que Vehículos). */
const GROUPED_PAGE_SIZE = 300

export async function fetchJobs(
  organizationId: string,
  filters: JobFilters,
  sort: JobSort,
  page: number,
  pageSize: number,
): Promise<{ rows: JobWithRelations[]; count: number }> {
  let query = supabase
    .from('jobs')
    .select(JOB_SELECT_WITH_RELATIONS, { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  const search = escapeIlikeTerm(filters.search)
  if (search) {
    query = query.or(`job_number.ilike.%${search}%,sender_name.ilike.%${search}%,receiver_name.ilike.%${search}%`)
  }
  if (filters.dateRange.from) query = query.gte('scheduled_date', filters.dateRange.from)
  if (filters.dateRange.to) query = query.lte('scheduled_date', filters.dateRange.to)

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
  return { rows: (data ?? []) as unknown as JobWithRelations[], count: count ?? 0 }
}

export async function fetchJobById(id: string): Promise<JobWithRelations> {
  const { data, error } = await supabase.from('jobs').select(JOB_SELECT_WITH_RELATIONS).eq('id', id).single()
  if (error) throw error
  return data as unknown as JobWithRelations
}

function randomToken(length: number): string {
  // Sin 0/O ni 1/I/L (se confunden al leerlos en voz alta o a mano).
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

/** El folio (`job_number`) y el `id` de un pedido nuevo se generan en el
 * dispositivo, no en el servidor — es lo que permite crear un pedido sin
 * conexión: nacen estables desde el momento en que se abre el formulario
 * (`JobDetailPage`, wizard de creación) y quedan persistidos en el
 * borrador de `sessionStorage` desde ahí. Así, sin importar cuándo ni
 * cuántas veces se reintente el `insert` hasta que vuelva la señal, es
 * siempre el mismo folio — nunca depende de si "cayó" a la base de datos.
 * Formato `PED-<6 caracteres>-<DDMMYY>` (mismo criterio de "fecha al
 * final" que el consecutivo anterior, pero sin depender de una secuencia
 * atómica del servidor, que no se puede coordinar sin conexión). El
 * trigger `set_job_number()` en la base sigue existiendo como respaldo
 * (solo actúa si `job_number` llega null), pero el frontend ya nunca lo
 * necesita para pedidos creados desde aquí. */
export function generateJobNumber(): string {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yy = String(now.getFullYear()).slice(-2)
  return `PED-${randomToken(6)}-${dd}${mm}${yy}`
}

export function generateJobId(): string {
  return crypto.randomUUID()
}

export async function createJob(organizationId: string, input: JobInsert): Promise<Job> {
  // `getSession()` en vez de `getUser()`: lee la sesión ya guardada en
  // localStorage sin llamar al servidor de Auth — `getUser()` sí hace esa
  // llamada de red, lo que tronaría este paso sin conexión antes de
  // siquiera intentar el `insert`.
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { data, error } = await supabase
    .from('jobs')
    .insert({ ...input, organization_id: organizationId, created_by: session?.user.id ?? null })
    .select()
    .single()

  if (error) {
    // Reintento tras una respuesta perdida (típico sin conexión: el
    // `insert` anterior sí llegó y se guardó, pero la respuesta nunca
    // volvió al dispositivo). Como `id`/`job_number` son estables entre
    // reintentos, un choque de llave primaria aquí significa "ya se
    // guardó", no un error real — se recupera la fila existente en vez de
    // fallar y mostrarle al operador un error sobre un pedido que sí se
    // creó.
    if (error.code === '23505' && input.id) {
      const { data: existing, error: fetchError } = await supabase.from('jobs').select('*').eq('id', input.id).single()
      if (!fetchError && existing) return existing
    }
    throw error
  }
  return data
}

export async function updateJob(id: string, input: JobUpdate): Promise<Job> {
  const { data, error } = await supabase.from('jobs').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function softDeleteJob(id: string): Promise<void> {
  const { error } = await supabase.from('jobs').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export interface JobOption {
  id: string
  job_number: string | null
  customers: { name: string } | null
}

export async function fetchPendingJobOptions(organizationId: string, scheduledDate?: string): Promise<JobOption[]> {
  let query = supabase
    .from('jobs')
    .select('id, job_number, customers(name)')
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .is('deleted_at', null)

  if (scheduledDate) {
    query = query.eq('scheduled_date', scheduledDate)
  }

  const { data, error } = await query.order('scheduled_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as JobOption[]
}

export interface MyJob {
  id: string
  job_number: string | null
  status: string
  priority: string
  scheduled_date: string | null
  time_window_start: string | null
  time_window_end: string | null
  amount: number | null
  cod_amount: number | null
  receiver_name: string | null
  receiver_phone: string | null
  instructions: string | null
  received_at: string | null
  delivery_latitude: number | null
  delivery_longitude: number | null
  customers: { name: string } | null
  customer_locations: { name: string; address: string | null; latitude: number | null; longitude: number | null } | null
}

const MY_JOB_SELECT =
  'id, job_number, status, priority, scheduled_date, time_window_start, time_window_end, amount, cod_amount, receiver_name, receiver_phone, instructions, received_at, delivery_latitude, delivery_longitude, customers(name), customer_locations!jobs_customer_location_id_fkey(name, address, latitude, longitude)'

/** Pedidos asignados a un operador — vista angosta para la app del
 * repartidor (`/app/pedidos`), no la lista administrativa completa de
 * `fetchJobs`. Filtrar por `assigned_driver_id` es un filtro de UX (RLS ya
 * permite a cualquier miembro de la org ver todos los pedidos vía
 * `jobs_select`), igual criterio que el resto del proyecto. */
export async function fetchMyJobs(driverId: string): Promise<MyJob[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select(MY_JOB_SELECT)
    .eq('assigned_driver_id', driverId)
    .is('deleted_at', null)
    .order('scheduled_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data ?? []) as unknown as MyJob[]
}

export function addressLabel(job: MyJob): string {
  const location = job.customer_locations
  if (!location) return 'Sin domicilio de entrega'
  return location.address ? `${location.name} — ${location.address}` : location.name
}

/** Link real de navegación (Google Maps, misma app que ya usa todo el
 * proyecto) con direcciones al domicilio de entrega — prioriza
 * coordenadas reales si existen, cae a buscar por dirección de texto si
 * no. `null` solo si el pedido no tiene ningún dato de ubicación. */
export function directionsUrl(job: MyJob): string | null {
  const location = job.customer_locations
  if (!location) return null
  if (location.latitude != null && location.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}&travelmode=driving`
  }
  if (location.address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}&travelmode=driving`
  }
  return null
}

/** Estados que cuentan como "todavía por entregar" para la app del
 * repartidor (pestaña "Activos" de `/app/pedidos` y las paradas que se
 * grafican en `/app/mapa`) — compartido entre ambas pantallas para que
 * nunca queden desincronizadas sobre qué es "pendiente". */
export const ACTIVE_JOB_STATUSES = ['pending', 'en_route', 'arrived']

const PRIORITY_WEIGHT: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 }

/** Orden real de entrega para la app del repartidor: prioridad capturada
 * en el pedido primero (urgente > alta > normal > baja), luego fecha/
 * ventana de horario programada. No es una ruta optimizada por algoritmo
 * (un motor de ruteo real es una feature aparte que no se ha pedido) —
 * es el orden que ya dictan los campos reales que el pedido ya tiene. */
export function sortJobsForDelivery(jobs: MyJob[]): MyJob[] {
  return [...jobs].sort((a, b) => {
    const priorityDiff = (PRIORITY_WEIGHT[a.priority] ?? 2) - (PRIORITY_WEIGHT[b.priority] ?? 2)
    if (priorityDiff !== 0) return priorityDiff
    const dateDiff = (a.scheduled_date ?? '9999-12-31').localeCompare(b.scheduled_date ?? '9999-12-31')
    if (dateDiff !== 0) return dateDiff
    return (a.time_window_start ?? '99:99').localeCompare(b.time_window_start ?? '99:99')
  })
}

/** Link de navegación multi-parada real de Google Maps (waypoints nativos,
 * origen = ubicación actual del dispositivo — Maps la resuelve sola al
 * abrir la app en el celular) sobre las paradas ya ordenadas por
 * `sortJobsForDelivery`. No es un motor de ruteo propio, es la función de
 * waypoints que Maps ya ofrece. Se limita a 10 paradas (destino + 9
 * waypoints, tope práctico del esquema de URL de Maps) — con más paradas
 * que eso, el botón sigue abriendo una ruta real y correcta, solo no
 * cubre las que quedan después de la parada 10 en un solo trazo. */
export function multiStopDirectionsUrl(stops: { latitude: number; longitude: number }[]): string | null {
  if (stops.length === 0) return null
  const capped = stops.slice(0, 10)
  const destination = capped[capped.length - 1]
  const waypoints = capped.slice(0, -1)
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.latitude},${destination.longitude}`,
    travelmode: 'driving',
  })
  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.map((w) => `${w.latitude},${w.longitude}`).join('|'))
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export interface JobForStop {
  id: string
  job_number: string | null
  job_type: string
  estimated_service_minutes: number | null
  customer_locations: { name: string; address: string | null; latitude: number | null; longitude: number | null } | null
}

export async function fetchJobForStop(jobId: string): Promise<JobForStop> {
  const { data, error } = await supabase
    .from('jobs')
    .select('id, job_number, job_type, estimated_service_minutes, customer_locations!jobs_customer_location_id_fkey(name, address, latitude, longitude)')
    .eq('id', jobId)
    .single()
  if (error) throw error
  return data as unknown as JobForStop
}
