import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ClipboardList, MapPinOff, Truck } from 'lucide-react'
import { Map, type MapMarker } from '@/components/map/Map'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Input } from '@/components/ui/Input'
import { LOCATION_TYPES } from '@/features/locations/api/locationsApi'
import { ROUTE_STATUSES } from '@/features/routes/api/routePlansApi'
import { STOP_STATUSES } from '@/features/routes/api/routeStopsApi'
import { useRoutePlan, useRoutePlansQuery, useRouteStops } from '@/features/routes/hooks/useRoutes'
import { useControlKpis, useLocationCounts, useMappedLocations } from './hooks/useControlMap'

const LOCATION_TYPE_LABELS = Object.fromEntries(LOCATION_TYPES.map((t) => [t.value, t.label]))
const ROUTE_STATUS_LABELS = Object.fromEntries(ROUTE_STATUSES.map((s) => [s.value, s.label]))
const STOP_STATUS_LABELS = Object.fromEntries(STOP_STATUSES.map((s) => [s.value, s.label]))

const STOP_STATUS_COLOR: Record<string, string> = {
  pending: '#9ca3af',
  in_progress: '#6366f1',
  completed: '#16a34a',
  skipped: '#dc2626',
}

const STOP_STATUS_TONE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-500',
  in_progress: 'bg-status-progress-bg text-status-progress',
  completed: 'bg-status-active-bg text-status-active',
  skipped: 'bg-status-delayed-bg text-status-delayed',
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  tone,
}: {
  icon: typeof Building2
  label: string
  value: string
  sublabel?: string
  tone: 'accent' | 'green' | 'gray' | 'progress'
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
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-tight text-ink">{value}</p>
        <p className="truncate text-xs text-gray-500">{sublabel ?? label}</p>
      </div>
    </div>
  )
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function ControlMapPage() {
  const [date, setDate] = useState(todayIso())
  const [search, setSearch] = useState('')
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)

  const mappedQuery = useMappedLocations()
  const countsQuery = useLocationCounts()
  const kpisQuery = useControlKpis(date)
  const routesQuery = useRoutePlansQuery({ scheduledDate: date, status: null })
  const selectedRouteQuery = useRoutePlan(selectedRouteId ?? undefined)
  const selectedStopsQuery = useRouteStops(selectedRouteId ?? undefined)

  const withoutCoordinates =
    countsQuery.data && mappedQuery.data ? countsQuery.data.total - mappedQuery.data.length : 0

  const filteredRoutes = useMemo(() => {
    const routes = routesQuery.data ?? []
    const term = search.trim().toLowerCase()
    if (!term) return routes
    return routes.filter((route) => {
      const driverName = route.drivers ? `${route.drivers.first_name} ${route.drivers.last_name}` : ''
      const vehicleLabel = route.vehicles?.economic_number ?? route.vehicles?.plate ?? ''
      return (
        (route.name ?? '').toLowerCase().includes(term) ||
        (route.route_number ?? '').toLowerCase().includes(term) ||
        driverName.toLowerCase().includes(term) ||
        vehicleLabel.toLowerCase().includes(term)
      )
    })
  }, [routesQuery.data, search])

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

    const stopMarkers: MapMarker[] = (selectedStopsQuery.data ?? [])
      .filter((stop): stop is typeof stop & { latitude: number; longitude: number } => stop.latitude != null && stop.longitude != null)
      .map((stop) => ({
        id: `stop-${stop.id}`,
        lat: stop.latitude,
        lng: stop.longitude,
        label: stop.name ?? stop.jobs?.customers?.name ?? 'Parada',
        description: `${STOP_STATUS_LABELS[stop.status] ?? stop.status}${stop.address ? ` · ${stop.address}` : ''}`,
        color: STOP_STATUS_COLOR[stop.status] ?? '#9ca3af',
      }))

    return [...locationMarkers, ...stopMarkers]
  }, [mappedQuery.data, selectedStopsQuery.data])

  const completedStops = (selectedStopsQuery.data ?? []).filter((s) => s.status === 'completed').length
  const totalStops = selectedStopsQuery.data?.length ?? 0
  const nextStop = (selectedStopsQuery.data ?? []).find((s) => s.status === 'pending' || s.status === 'in_progress')

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink">Centro de control</h1>
          <p className="text-sm text-gray-500">Operación del día: sucursales, rutas y pedidos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          <select
            value={selectedRouteId ?? ''}
            onChange={(e) => setSelectedRouteId(e.target.value || null)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          >
            <option value="">Todas las rutas</option>
            {filteredRoutes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name ?? route.route_number ?? route.id.slice(0, 8)}
                {route.drivers ? ` · ${route.drivers.first_name} ${route.drivers.last_name}` : ''}
              </option>
            ))}
          </select>
          <Input
            placeholder="Buscar ruta, operador o vehículo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
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
            />
            <StatCard
              icon={Building2}
              label="Pedidos entregados"
              value={`${kpisQuery.data?.jobsDelivered ?? 0}`}
              sublabel={`de ${kpisQuery.data?.jobsScheduled ?? 0} programados`}
              tone="green"
            />
            <StatCard icon={MapPinOff} label="Paradas pendientes hoy" value={`${kpisQuery.data?.stopsPending ?? 0}`} tone="gray" />
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white lg:flex-1">
          {mappedQuery.isError ? (
            <ErrorState message="No se pudo cargar el mapa." onRetry={() => void mappedQuery.refetch()} />
          ) : mappedQuery.isLoading ? (
            <Skeleton className="h-[480px]" />
          ) : markers.length > 0 ? (
            <Map className="h-[480px] w-full" markers={markers} />
          ) : (
            <EmptyState
              title="Sin ubicaciones que mostrar"
              description="Agrega coordenadas a tus sucursales o selecciona una ruta con paradas."
            />
          )}
        </div>

        {selectedRouteId && (
          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 lg:w-80">
            {selectedRouteQuery.isLoading ? (
              <Skeleton className="h-32" />
            ) : selectedRouteQuery.data ? (
              <>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {selectedRouteQuery.data.name ?? selectedRouteQuery.data.route_number ?? 'Ruta'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedRouteQuery.data.drivers
                      ? `${selectedRouteQuery.data.drivers.first_name} ${selectedRouteQuery.data.drivers.last_name}`
                      : 'Sin operador'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedRouteQuery.data.vehicles?.economic_number ?? selectedRouteQuery.data.vehicles?.plate ?? 'Sin vehículo'}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  {ROUTE_STATUS_LABELS[selectedRouteQuery.data.status] ?? selectedRouteQuery.data.status}
                </span>

                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Progreso</span>
                    <span>
                      {completedStops} de {totalStops}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-status-active"
                      style={{ width: totalStops > 0 ? `${(completedStops / totalStops) * 100}%` : '0%' }}
                    />
                  </div>
                </div>

                {nextStop && (
                  <div className="rounded-md bg-gray-50 p-2.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Siguiente parada</p>
                    <p className="text-sm font-medium text-gray-900">{nextStop.name ?? nextStop.jobs?.customers?.name ?? 'Parada'}</p>
                    <p className="text-xs text-gray-500">{nextStop.address ?? 'Sin dirección'}</p>
                  </div>
                )}

                <Link to={`/rutas/${selectedRouteId}`} className="text-sm font-medium text-accent-600 hover:text-accent-700">
                  Ver ruta completa →
                </Link>
              </>
            ) : null}
          </div>
        )}
      </div>

      {selectedRouteId && selectedStopsQuery.data && selectedStopsQuery.data.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-ink">
            Ruta de {selectedRouteQuery.data?.name ?? selectedRouteQuery.data?.route_number ?? ''}
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {selectedStopsQuery.data.map((stop, index) => (
              <div key={stop.id} className="flex shrink-0 items-center gap-3">
                <div className="w-36 shrink-0">
                  <p className="text-xs font-medium text-gray-400">Parada {index + 1}</p>
                  <p className="truncate text-sm font-medium text-gray-900">{stop.name ?? stop.jobs?.customers?.name ?? 'Parada'}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STOP_STATUS_TONE[stop.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {STOP_STATUS_LABELS[stop.status] ?? stop.status}
                  </span>
                </div>
                {index < (selectedStopsQuery.data?.length ?? 0) - 1 && <span className="text-gray-300">→</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {withoutCoordinates > 0 && (
        <p className="text-xs text-gray-400">
          {withoutCoordinates} sucursal(es) sin coordenadas no aparecen en el mapa.
        </p>
      )}
    </div>
  )
}
