import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  ClipboardList,
  MapPin,
  MapPinOff,
  Package,
  Phone,
  Route as RouteIcon,
  Truck,
  User,
  Users,
} from 'lucide-react'
import { Map, type MapMarker } from '@/components/map/Map'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDateTime, getInitials } from '@/lib/format'
import { LOCATION_TYPES } from '@/features/locations/api/locationsApi'
import { ROUTE_STATUSES } from '@/features/routes/api/routePlansApi'
import { STOP_STATUSES } from '@/features/routes/api/routeStopsApi'
import { JOB_STATUSES } from '@/features/jobs/api/jobsApi'
import { JobDetailContent } from '@/features/jobs/JobDetailContent'
import { useRouteDriverOptions, useRoutePlan, useRoutePlansQuery, useRouteStops } from '@/features/routes/hooks/useRoutes'
import { fetchRoutePlanIdForJob } from '@/features/routes/api/routeStopsApi'
import { useControlKpis, useDayJobs, useLiveVehiclePositions, useLocationCounts, useMappedLocations } from './hooks/useControlMap'
import { PageScroll } from '@/components/ui/PageScroll'

const LOCATION_TYPE_LABELS = Object.fromEntries(LOCATION_TYPES.map((t) => [t.value, t.label]))
const ROUTE_STATUS_LABELS = Object.fromEntries(ROUTE_STATUSES.map((s) => [s.value, s.label]))
const STOP_STATUS_LABELS = Object.fromEntries(STOP_STATUSES.map((s) => [s.value, s.label]))
const JOB_STATUS_LABELS = Object.fromEntries(JOB_STATUSES.map((s) => [s.value, s.label]))

const STOP_STATUS_COLOR: Record<string, string> = {
  pending: '#9ca3af',
  in_progress: '#6366f1',
  completed: '#16a34a',
  skipped: '#dc2626',
}

const JOB_STATUS_COLOR: Record<string, string> = {
  pending: '#9ca3af',
  en_route: '#6366f1',
  arrived: '#6366f1',
  delivered: '#16a34a',
  partial: '#d97706',
  not_delivered: '#dc2626',
  rejected: '#dc2626',
  rescheduled: '#d97706',
}

const JOB_STATUS_TONE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-500',
  en_route: 'bg-status-progress-bg text-status-progress',
  arrived: 'bg-status-progress-bg text-status-progress',
  delivered: 'bg-status-active-bg text-status-active',
  partial: 'bg-status-stopped-bg text-status-stopped',
  not_delivered: 'bg-status-delayed-bg text-status-delayed',
  rejected: 'bg-status-delayed-bg text-status-delayed',
  rescheduled: 'bg-status-stopped-bg text-status-stopped',
}

const ROUTE_STATUS_TONE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  planned: 'bg-status-progress-bg text-status-progress',
  in_progress: 'bg-status-active-bg text-status-active',
  completed: 'bg-status-active-bg text-status-active',
  cancelled: 'bg-status-delayed-bg text-status-delayed',
}

function formatTime(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

/** Posiciones más viejas que esto se consideran obsoletas y no se pintan
 * como "en vivo" — el operador dejó de compartir o cerró la pestaña. */
const LIVE_POSITION_STALE_MS = 20 * 60 * 1000

function formatAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return `hace ${seconds}s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.round(minutes / 60)
  return `hace ${hours} h`
}

function vehicleLabel(vehicle: { brand: string | null; model: string | null } | null | undefined): string | null {
  if (!vehicle) return null
  const label = [vehicle.brand, vehicle.model].filter(Boolean).join(' ')
  return label || null
}

function InfoCell({
  icon: Icon,
  label,
  value,
  sublabel,
  subtone,
  progress,
}: {
  icon: typeof Package
  label: string
  value: string
  sublabel?: string
  subtone?: 'ok' | 'late' | 'neutral'
  progress?: number
}) {
  const subClass = subtone === 'late' ? 'text-status-delayed' : subtone === 'ok' ? 'text-status-active' : 'text-gray-400'
  return (
    <div className="rounded-md bg-gray-50 p-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-gray-400">
        <Icon size={12} strokeWidth={2} />
        <p className="text-[11px] font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="truncate text-sm font-semibold text-gray-900">{value}</p>
      {sublabel && <p className={`mt-0.5 text-xs ${subClass}`}>{sublabel}</p>}
      {progress != null && (
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div className="h-full rounded-full bg-status-active" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  tone,
  trendPct,
}: {
  icon: typeof Building2
  label: string
  value: string
  sublabel?: string
  tone: 'accent' | 'green' | 'gray' | 'progress'
  trendPct?: number | null
}) {
  const toneClasses = {
    accent: 'bg-accent-50 text-accent-600',
    green: 'bg-status-active-bg text-status-active',
    gray: 'bg-gray-100 text-gray-500',
    progress: 'bg-status-progress-bg text-status-progress',
  }[tone]

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneClasses}`}>
        <Icon size={18} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-lg font-semibold leading-tight text-ink">{value}</p>
          {trendPct != null && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
                trendPct >= 0 ? 'bg-status-active-bg text-status-active' : 'bg-status-delayed-bg text-status-delayed'
              }`}
            >
              {trendPct >= 0 ? '↑' : '↓'}
              {Math.abs(trendPct)}%
            </span>
          )}
        </div>
        <p className="truncate text-xs text-gray-500">{sublabel ?? label}</p>
      </div>
    </div>
  )
}

function driverName(driver: { first_name: string; last_name: string } | null) {
  return driver ? `${driver.first_name} ${driver.last_name}` : null
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function ControlMapPage() {
  const [date, setDate] = useState(todayIso())
  const [search, setSearch] = useState('')
  const [driverFilter, setDriverFilter] = useState('')
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [resolvingJobRoute, setResolvingJobRoute] = useState(false)
  const [viewJobId, setViewJobId] = useState<string | null>(null)

  const mappedQuery = useMappedLocations()
  const countsQuery = useLocationCounts()
  const kpisQuery = useControlKpis(date)
  const dayJobsQuery = useDayJobs(date)
  const routesQuery = useRoutePlansQuery({ scheduledDate: date, status: null })
  const allDriversQuery = useRouteDriverOptions()
  const liveVehiclesQuery = useLiveVehiclePositions()
  const selectedRouteQuery = useRoutePlan(selectedRouteId ?? undefined)
  const selectedStopsQuery = useRouteStops(selectedRouteId ?? undefined)

  const withoutCoordinates =
    countsQuery.data && mappedQuery.data ? countsQuery.data.total - mappedQuery.data.length : 0

  // Selecciona automáticamente la primera ruta disponible (filtrada por
  // repartidor si aplica) al cambiar de fecha/repartidor, para que el panel
  // de la unidad se vea de inmediato como en la referencia — pero solo una
  // vez por combinación fecha+repartidor, así no pisa una elección manual
  // del usuario en el select de rutas.
  const autoSelectKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!routesQuery.data) return
    const key = `${date}|${driverFilter}`
    if (autoSelectKeyRef.current === key) return
    autoSelectKeyRef.current = key
    const candidates = driverFilter ? routesQuery.data.filter((r) => r.driver_id === driverFilter) : routesQuery.data
    setSelectedJobId(null)
    setSelectedRouteId(candidates[0]?.id ?? null)
  }, [date, driverFilter, routesQuery.data])

  const driverOptions = useMemo(
    () => (allDriversQuery.data ?? []).map((d) => [d.id, `${d.first_name} ${d.last_name}`] as const),
    [allDriversQuery.data],
  )

  const filteredRoutes = useMemo(() => {
    const routes = routesQuery.data ?? []
    const term = search.trim().toLowerCase()
    return routes.filter((route) => {
      if (driverFilter && route.driver_id !== driverFilter) return false
      if (!term) return true
      const driver = driverName(route.drivers) ?? ''
      const vehicleLabel = route.vehicles?.economic_number ?? route.vehicles?.plate ?? ''
      return (
        (route.name ?? '').toLowerCase().includes(term) ||
        (route.route_number ?? '').toLowerCase().includes(term) ||
        driver.toLowerCase().includes(term) ||
        vehicleLabel.toLowerCase().includes(term)
      )
    })
  }, [routesQuery.data, search, driverFilter])

  const stops = selectedStopsQuery.data ?? []

  const dayJobs = useMemo(
    () => (dayJobsQuery.data ?? []).filter((job) => !driverFilter || job.assigned_driver_id === driverFilter),
    [dayJobsQuery.data, driverFilter],
  )

  const markers: MapMarker[] = useMemo(() => {
    const locationMarkers: MapMarker[] = (mappedQuery.data ?? []).map((location) => ({
      id: `loc-${location.id}`,
      lat: location.latitude,
      lng: location.longitude,
      label: location.name,
      description: [LOCATION_TYPE_LABELS[location.location_type] ?? location.location_type, location.city]
        .filter(Boolean)
        .join(' · '),
    }))

    const stopMarkers: MapMarker[] = stops
      .filter((stop): stop is typeof stop & { latitude: number; longitude: number } => stop.latitude != null && stop.longitude != null)
      .map((stop) => ({
        id: `stop-${stop.id}`,
        lat: stop.latitude,
        lng: stop.longitude,
        label: stop.name ?? stop.jobs?.customers?.name ?? 'Parada',
        description: `${STOP_STATUS_LABELS[stop.status] ?? stop.status}${stop.address ? ` · ${stop.address}` : ''}`,
        color: STOP_STATUS_COLOR[stop.status] ?? '#9ca3af',
        href: stop.job_id ? `/pedidos/${stop.job_id}` : undefined,
      }))

    // Pedidos del día con domicilio de entrega real, sin importar si ya
    // tienen una ruta/parada asignada — para que un pedido recién creado
    // sea visible en el mapa de inmediato. Respeta el filtro de repartidor.
    const jobMarkers: MapMarker[] = dayJobs
      .filter(
        (job): job is typeof job & { customer_locations: { latitude: number; longitude: number; name: string; address: string | null } } =>
          job.customer_locations?.latitude != null && job.customer_locations?.longitude != null,
      )
      .map((job) => ({
        id: `job-${job.id}`,
        lat: job.customer_locations.latitude,
        lng: job.customer_locations.longitude,
        label: `${job.job_number ?? 'Pedido'} · ${job.customers?.name ?? job.customer_locations.name}`,
        description: `${JOB_STATUS_LABELS[job.status] ?? job.status}${job.customer_locations.address ? ` · ${job.customer_locations.address}` : ''}`,
        color: JOB_STATUS_COLOR[job.status] ?? '#9ca3af',
        href: `/pedidos/${job.id}`,
      }))

    // Posición real compartida desde el celular del operador (vía
    // update_my_vehicle_position). Se ignoran lecturas viejas (nadie
    // comparte hace rato) y se respeta el filtro de repartidor.
    const liveMarkers: MapMarker[] = (liveVehiclesQuery.data ?? [])
      .filter((v) => Date.now() - new Date(v.last_position_at).getTime() <= LIVE_POSITION_STALE_MS)
      .filter((v) => !driverFilter || v.assigned_driver_id === driverFilter)
      .map((v) => {
        const name = v.drivers ? `${v.drivers.first_name} ${v.drivers.last_name}` : v.economic_number ?? v.plate ?? 'Vehículo'
        return {
          id: `live-${v.id}`,
          lat: v.last_latitude,
          lng: v.last_longitude,
          label: `🟢 ${name}`,
          description: `Ubicación en vivo · ${formatAgo(v.last_position_at)}`,
          color: '#16a34a',
          pulse: true,
          // Avatar real del operador (foto o iniciales) en vez del punto
          // simple — es la unidad más importante de reconocer en el mapa,
          // se gana el ícono grande.
          avatarUrl: v.drivers?.photo_url ?? null,
          avatarInitials: getInitials(name),
        }
      })

    return [...locationMarkers, ...stopMarkers, ...jobMarkers, ...liveMarkers]
  }, [mappedQuery.data, stops, dayJobs, liveVehiclesQuery.data, driverFilter])

  const routePolyline = useMemo(
    () =>
      stops
        .filter((s): s is typeof s & { latitude: number; longitude: number } => s.latitude != null && s.longitude != null)
        .map((s) => ({ lat: s.latitude, lng: s.longitude })),
    [stops],
  )

  const completedStops = stops.filter((s) => s.status === 'completed').length
  const totalStops = stops.length
  const currentStop = stops.find((s) => s.status === 'in_progress') ?? stops.find((s) => s.status === 'pending')
  const route = selectedRouteQuery.data
  const routeDriverName = driverName(route?.drivers ?? null)
  const selectedJob = selectedJobId ? dayJobs.find((j) => j.id === selectedJobId) ?? null : null
  const selectedJobDriverName = selectedJob ? driverName(selectedJob.drivers) : null

  function selectRoute(id: string | null) {
    setSelectedJobId(null)
    setSelectedRouteId(id)
  }

  async function handleMarkerClick(marker: MapMarker) {
    if (marker.id.startsWith('job-')) {
      const jobId = marker.id.slice('job-'.length)
      setResolvingJobRoute(true)
      try {
        const routeId = await fetchRoutePlanIdForJob(jobId)
        if (routeId) {
          selectRoute(routeId)
        } else {
          setSelectedRouteId(null)
          setSelectedJobId(jobId)
        }
      } finally {
        setResolvingJobRoute(false)
      }
    }
    // Las paradas ('stop-*') ya pertenecen a la ruta seleccionada — su
    // info ya está en el panel. Las sucursales ('loc-*') solo abren popup.
  }

  return (
    <>
    <PageScroll>
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-ink">Centro de control</h1>
            <p className="text-sm text-gray-500">Operación del día: sucursales, rutas y pedidos.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700">
              <Calendar size={14} strokeWidth={2} className="text-gray-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-auto border-0 p-0 text-sm text-gray-900 focus:outline-none focus:ring-0"
              />
            </label>
            <label className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700">
              <RouteIcon size={14} strokeWidth={2} className="text-gray-400" />
              <select
                value={selectedRouteId ?? ''}
                onChange={(e) => selectRoute(e.target.value || null)}
                className="border-0 bg-transparent p-0 text-sm text-gray-900 focus:outline-none focus:ring-0"
              >
                <option value="">Todas las rutas</option>
                {filteredRoutes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name ?? r.route_number ?? r.id.slice(0, 8)}
                    {r.drivers ? ` · ${driverName(r.drivers)}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700">
              <Users size={14} strokeWidth={2} className="text-gray-400" />
              <select
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
                className="border-0 bg-transparent p-0 text-sm text-gray-900 focus:outline-none focus:ring-0"
              >
                <option value="">Todos los repartidores</option>
                {driverOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <Input
              placeholder="Buscar ruta, operador o vehículo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 rounded-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpisQuery.isLoading ? (
            <>
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </>
          ) : (
            <>
              <StatCard
                icon={Truck}
                label="Vehículos activos"
                value={`${kpisQuery.data?.vehiclesActive ?? 0}`}
                sublabel={`de ${kpisQuery.data?.vehiclesTotal ?? 0} registrados`}
                tone="accent"
              />
              <StatCard
                icon={ClipboardList}
                label="Rutas en curso"
                value={`${kpisQuery.data?.routesInProgress ?? 0}`}
                sublabel={`de ${kpisQuery.data?.routesTotal ?? 0} hoy`}
                tone="progress"
                trendPct={kpisQuery.data?.routesInProgressTrendPct}
              />
              <StatCard
                icon={Building2}
                label="Pedidos entregados"
                value={`${kpisQuery.data?.jobsDelivered ?? 0}`}
                sublabel={`de ${kpisQuery.data?.jobsScheduled ?? 0} programados`}
                tone="green"
                trendPct={kpisQuery.data?.jobsDeliveredTrendPct}
              />
              <StatCard icon={MapPinOff} label="Paradas pendientes hoy" value={`${kpisQuery.data?.stopsPending ?? 0}`} tone="gray" />
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white">
            {mappedQuery.isError ? (
              <ErrorState message="No se pudo cargar el mapa." onRetry={() => void mappedQuery.refetch()} />
            ) : mappedQuery.isLoading ? (
              <Skeleton className="h-[380px] lg:h-[620px]" />
            ) : markers.length > 0 ? (
              <>
                <Map className="h-[380px] w-full lg:h-[620px]" markers={markers} polyline={routePolyline} onMarkerClick={handleMarkerClick} />
                <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 px-3 py-2 text-[11px] text-gray-500">
                  {(liveVehiclesQuery.data?.length ?? 0) > 0 && (
                    <>
                      <span className="flex items-center gap-1 font-medium text-status-active">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-status-active" />
                        {liveVehiclesQuery.data!.length} en vivo
                      </span>
                      <span className="h-3 w-px bg-gray-200" />
                    </>
                  )}
                  <span className="font-medium text-gray-400">Pedidos:</span>
                  {JOB_STATUSES.map((s) => (
                    <span key={s.value} className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full" style={{ background: JOB_STATUS_COLOR[s.value] }} />
                      {s.label}
                    </span>
                  ))}
                  {selectedRouteId && (
                    <>
                      <span className="mx-1 h-3 w-px bg-gray-200" />
                      <span className="font-medium text-gray-400">Paradas:</span>
                      {STOP_STATUSES.map((s) => (
                        <span key={s.value} className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full" style={{ background: STOP_STATUS_COLOR[s.value] }} />
                          {s.label}
                        </span>
                      ))}
                    </>
                  )}
                </div>
              </>
            ) : (
              <EmptyState
                title="Sin ubicaciones que mostrar"
                description="Agrega coordenadas a tus sucursales o selecciona una ruta con paradas."
              />
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 lg:w-96">
            {resolvingJobRoute ? (
              <Skeleton className="h-32" />
            ) : selectedRouteId ? (
              selectedRouteQuery.isLoading ? (
                <Skeleton className="h-32" />
              ) : route ? (
                <>
                  <div className="flex items-center gap-3">
                    {route.drivers?.photo_url ? (
                      <img src={route.drivers.photo_url} alt={routeDriverName ?? ''} className="h-11 w-11 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-50 text-sm font-semibold text-accent-600">
                        {routeDriverName ? getInitials(routeDriverName) : <User size={18} strokeWidth={2} />}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold text-ink">{routeDriverName ?? 'Sin operador'}</p>
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${ROUTE_STATUS_TONE[route.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {ROUTE_STATUS_LABELS[route.status] ?? route.status}
                        </span>
                      </div>
                      <p className="truncate text-xs text-gray-500">{route.name ?? route.route_number ?? 'Ruta'}</p>
                    </div>
                  </div>

                  <div className="space-y-0.5 text-xs text-gray-500">
                    {route.vehicles?.economic_number && <p>ID #{route.vehicles.economic_number}</p>}
                    {vehicleLabel(route.vehicles) && <p>Vehículo: {vehicleLabel(route.vehicles)}</p>}
                    {route.vehicles?.plate && <p>Placas: {route.vehicles.plate}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <InfoCell
                      icon={Package}
                      label="Pedido actual"
                      value={currentStop?.jobs?.job_number ?? '—'}
                      sublabel={currentStop?.jobs?.customers?.name}
                    />
                    <InfoCell
                      icon={MapPin}
                      label="Siguiente parada"
                      value={currentStop?.name ?? currentStop?.jobs?.customers?.name ?? '—'}
                      sublabel={currentStop?.address ?? undefined}
                    />
                    <InfoCell
                      icon={Clock}
                      label="Hora estimada de llegada"
                      value={formatTime(currentStop?.estimated_arrival_at ?? null) ?? 'Sin estimar'}
                      sublabel={
                        currentStop?.estimated_arrival_at
                          ? new Date(currentStop.estimated_arrival_at).getTime() < Date.now() && currentStop.status !== 'completed'
                            ? 'Retrasado'
                            : 'En tiempo'
                          : undefined
                      }
                      subtone={
                        currentStop?.estimated_arrival_at
                          ? new Date(currentStop.estimated_arrival_at).getTime() < Date.now() && currentStop.status !== 'completed'
                            ? 'late'
                            : 'ok'
                          : 'neutral'
                      }
                    />
                    <InfoCell
                      icon={CheckCircle2}
                      label="Entregas completadas"
                      value={`${completedStops} de ${totalStops}`}
                      progress={totalStops > 0 ? (completedStops / totalStops) * 100 : 0}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      to={`/rutas/${selectedRouteId}`}
                      className="flex-1 rounded-md bg-accent-500 px-3 py-1.5 text-center text-sm font-medium text-white hover:bg-accent-600"
                    >
                      Ver ruta
                    </Link>
                    {route.drivers?.phone && (
                      <a
                        href={`tel:${route.drivers.phone}`}
                        title="Llamar"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        <Phone size={14} strokeWidth={2} />
                      </a>
                    )}
                  </div>
                </>
              ) : null
            ) : selectedJob ? (
              <>
                <div className="flex items-center gap-3">
                  {selectedJob.drivers?.photo_url ? (
                    <img
                      src={selectedJob.drivers.photo_url}
                      alt={selectedJobDriverName ?? ''}
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-50 text-sm font-semibold text-accent-600">
                      {selectedJobDriverName ? getInitials(selectedJobDriverName) : <Building2 size={18} strokeWidth={2} />}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-ink">{selectedJobDriverName ?? 'Sin operador asignado'}</p>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${JOB_STATUS_TONE[selectedJob.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {JOB_STATUS_LABELS[selectedJob.status] ?? selectedJob.status}
                      </span>
                    </div>
                    <p className="truncate text-xs text-gray-500">
                      {selectedJob.job_number ?? 'Pedido'} · {selectedJob.customers?.name ?? 'Sin cliente'}
                    </p>
                  </div>
                </div>

                {(selectedJob.vehicles?.economic_number || vehicleLabel(selectedJob.vehicles) || selectedJob.vehicles?.plate) && (
                  <div className="space-y-0.5 text-xs text-gray-500">
                    {selectedJob.vehicles?.economic_number && <p>ID #{selectedJob.vehicles.economic_number}</p>}
                    {vehicleLabel(selectedJob.vehicles) && <p>Vehículo: {vehicleLabel(selectedJob.vehicles)}</p>}
                    {selectedJob.vehicles?.plate && <p>Placas: {selectedJob.vehicles.plate}</p>}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <InfoCell
                    icon={MapPin}
                    label="Domicilio de entrega"
                    value={selectedJob.customer_locations?.name ?? 'Sin domicilio'}
                    sublabel={selectedJob.customer_locations?.address ?? undefined}
                  />
                  <InfoCell icon={User} label="Destinatario" value={selectedJob.receiver_name ?? '—'} />
                  <InfoCell icon={Package} label="Monto" value={selectedJob.amount != null ? formatCurrency(selectedJob.amount) : '—'} />
                </div>

                <p className="text-xs text-gray-400">Sin ruta asignada todavía.</p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setViewJobId(selectedJob.id)}
                    className="flex-1 rounded-md bg-accent-500 px-3 py-1.5 text-center text-sm font-medium text-white hover:bg-accent-600"
                  >
                    Ver pedido completo
                  </button>
                  {selectedJob.drivers?.phone && (
                    <a
                      href={`tel:${selectedJob.drivers.phone}`}
                      title="Llamar"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      <Phone size={14} strokeWidth={2} />
                    </a>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center text-sm text-gray-400">
                <MapPinOff size={22} strokeWidth={1.5} />
                Selecciona una ruta o haz click en un pedido del mapa para ver su detalle aquí.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Pedidos del día</p>
            <span className="text-xs text-gray-500">{dayJobs.length} pedido(s)</span>
          </div>
          {dayJobsQuery.isLoading ? (
            <Skeleton className="h-24" />
          ) : dayJobs.length > 0 ? (
            <div className="flex flex-col divide-y divide-gray-100">
              {dayJobs.map((job) => (
                <button
                  type="button"
                  key={job.id}
                  onClick={() => setViewJobId(job.id)}
                  className="flex items-center justify-between gap-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">
                      {job.job_number ?? 'Sin número'} <span className="font-normal text-gray-500">· {job.customers?.name ?? 'Sin cliente'}</span>
                    </p>
                    <p className="truncate text-xs text-gray-500">{job.customer_locations?.name ?? job.customer_locations?.address ?? 'Sin domicilio'}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${JOB_STATUS_TONE[job.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {JOB_STATUS_LABELS[job.status] ?? job.status}
                  </span>
                  <span className="w-20 shrink-0 text-right text-xs text-gray-500">{job.amount != null ? formatCurrency(job.amount) : '—'}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Sin pedidos programados para esta fecha.</p>
          )}
        </div>

        {selectedRouteId && stops.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">
                Ruta de {routeDriverName ?? route?.name ?? route?.route_number ?? ''}
              </p>
              <span className="text-xs text-gray-500">
                {completedStops} de {totalStops} entregas
              </span>
            </div>
            <div className="flex gap-0 overflow-x-auto pb-1">
              {stops.map((stop, index) => {
                const done = stop.status === 'completed'
                const current = stop.status === 'in_progress'
                const timeLabel = stop.completed_at
                  ? `Entregado · ${formatDateTime(stop.completed_at)}`
                  : stop.arrived_at
                    ? `Llegó · ${formatDateTime(stop.arrived_at)}`
                    : stop.estimated_arrival_at
                      ? `Programado · ${formatDateTime(stop.estimated_arrival_at)}`
                      : STOP_STATUS_LABELS[stop.status] ?? stop.status

                return (
                  <div key={stop.id} className="flex shrink-0 items-start">
                    <div className="flex w-40 flex-col items-center text-center">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full ${
                          done
                            ? 'bg-status-active-bg text-status-active'
                            : current
                              ? 'bg-status-progress-bg text-status-progress'
                              : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {done ? <CheckCircle2 size={16} strokeWidth={2} /> : <Circle size={14} strokeWidth={2} />}
                      </span>
                      <p className="mt-1.5 truncate text-xs font-medium text-gray-900">{stop.name ?? stop.jobs?.customers?.name ?? `Parada ${index + 1}`}</p>
                      <p className="mt-0.5 text-[11px] text-gray-400">{timeLabel}</p>
                    </div>
                    {index < stops.length - 1 && (
                      <div className={`mt-3.5 h-0.5 w-8 shrink-0 ${done ? 'bg-status-active' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {withoutCoordinates > 0 && (
          <p className="text-xs text-gray-400">{withoutCoordinates} sucursal(es) sin coordenadas no aparecen en el mapa.</p>
        )}
      </div>
    </PageScroll>

    {viewJobId && (
      <Modal open title="Pedido" onClose={() => setViewJobId(null)}>
        <div className="-mx-6 -my-5 h-[75vh]">
          <JobDetailContent id={viewJobId} onBack={() => setViewJobId(null)} backLabel="Cerrar" />
        </div>
      </Modal>
    )}
    </>
  )
}
