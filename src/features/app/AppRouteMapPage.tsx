import { useMemo, useState } from 'react'
import { Navigation, Route } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageScroll } from '@/components/ui/PageScroll'
import { Modal } from '@/components/ui/Modal'
import { Map, type MapMarker } from '@/components/map/Map'
import { useLocationSharing } from '@/context/LocationSharingContext'
import { JobDetailContent } from '@/features/jobs/JobDetailContent'
import { useMyJobs } from '@/features/jobs/hooks/useJobs'
import { ACTIVE_JOB_STATUSES, addressLabel, directionsUrl, multiStopDirectionsUrl, sortJobsForDelivery, type MyJob } from '@/features/jobs/api/jobsApi'
import { formatCurrency, formatDate } from '@/lib/format'

/** Solo entran al mapa/ruta los pedidos que de verdad tienen a dónde
 * dirigir (coordenadas reales del domicilio) — mostrar un pedido sin
 * ubicación en la lista de paradas numeradas sería inventar una posición
 * que no existe. */
function hasCoordinates(job: MyJob): job is MyJob & { customer_locations: { latitude: number; longitude: number } } {
  const location = job.customer_locations
  return location != null && location.latitude != null && location.longitude != null
}

/** Pestaña "Mapa" de la app del repartidor — pedido explícito del usuario:
 * "ponle un mapa con orden de entrega y que ahi el mapa me lleve al
 * siguiente destino... una app profesional". El orden es real, no una
 * ruta optimizada por algoritmo: prioridad del pedido + horario
 * programado (`sortJobsForDelivery`) — un motor de ruteo de verdad es una
 * feature aparte que no se ha pedido. "Que me lleve" se resuelve con
 * navegación real: Google Maps (misma app que usa todo el proyecto) con
 * las coordenadas reales del domicilio, no un mapa que calcula su propia
 * ruta por carretera (eso requeriría la API de Directions de Google, con
 * costo aparte, y no se ha pedido). */
export function AppRouteMapPage() {
  const { driverProfile, driverProfileLoading } = useLocationSharing()
  const [viewJobId, setViewJobId] = useState<string | null>(null)
  const jobsQuery = useMyJobs(driverProfile?.driverId)

  const stops = useMemo(() => {
    const rows = jobsQuery.data ?? []
    const active = rows.filter((job) => ACTIVE_JOB_STATUSES.includes(job.status) && hasCoordinates(job))
    return sortJobsForDelivery(active)
  }, [jobsQuery.data])

  if (driverProfileLoading) {
    return (
      <PageScroll>
        <div className="p-6">
          <Skeleton className="h-40" />
        </div>
      </PageScroll>
    )
  }

  if (!driverProfile) {
    return (
      <PageScroll>
        <div className="mx-auto max-w-md p-6">
          <div className="rounded-lg border border-gray-200 bg-surface p-4 text-sm text-gray-500">
            Tu cuenta no está vinculada a un operador — solo los operadores tienen una ruta de entregas aquí.
          </div>
        </div>
      </PageScroll>
    )
  }

  const nextStop = stops[0]
  const markers: MapMarker[] = stops.map((job, index) => ({
    id: job.id,
    lat: job.customer_locations!.latitude!,
    lng: job.customer_locations!.longitude!,
    label: `${index + 1}. ${job.customers?.name ?? 'Sin cliente'}`,
    description: addressLabel(job),
    sequence: index + 1,
    color: index === 0 ? '#f0522a' : '#ff6a3d',
  }))
  const polyline = stops.map((job) => ({ lat: job.customer_locations!.latitude!, lng: job.customer_locations!.longitude! }))
  const fullRouteUrl = multiStopDirectionsUrl(
    stops.map((job) => ({ latitude: job.customer_locations!.latitude!, longitude: job.customer_locations!.longitude! })),
  )

  return (
    <PageScroll>
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-10">
        <div>
          <h1 className="text-xl font-semibold text-ink">Mapa de entregas</h1>
          <p className="text-sm text-gray-500">
            {stops.length === 0 ? 'Sin paradas pendientes con domicilio geolocalizado.' : `${stops.length} parada${stops.length === 1 ? '' : 's'} pendiente${stops.length === 1 ? '' : 's'}, en orden.`}
          </p>
        </div>

        {jobsQuery.isLoading && <Skeleton className="h-40" />}
        {jobsQuery.isError && <ErrorState message="No se pudo cargar tu ruta." onRetry={() => void jobsQuery.refetch()} />}

        {jobsQuery.isSuccess && stops.length === 0 && (
          <EmptyState
            title="Sin paradas que mostrar"
            description="No tienes pedidos activos con domicilio geolocalizado en este momento."
          />
        )}

        {nextStop && (
          <div className="rounded-lg border-2 border-accent-500 bg-accent-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">Siguiente parada</p>
            <button type="button" onClick={() => setViewJobId(nextStop.id)} className="mt-1 block w-full text-left">
              <p className="truncate text-sm font-semibold text-ink">{nextStop.customers?.name ?? 'Sin cliente'}</p>
              <p className="text-sm text-gray-600">{addressLabel(nextStop)}</p>
            </button>
            {directionsUrl(nextStop) && (
              <a
                href={directionsUrl(nextStop)!}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 rounded-full bg-accent-500 py-2 text-sm font-semibold text-white hover:bg-accent-600"
              >
                <Navigation size={15} strokeWidth={2.5} />
                Ir ahora
              </a>
            )}
          </div>
        )}

        {stops.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <Map className="h-72 w-full" markers={markers} polyline={polyline.length > 1 ? polyline : undefined} hideFullscreen />
          </div>
        )}

        {fullRouteUrl && stops.length > 1 && (
          <a
            href={fullRouteUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-full border border-accent-500 py-2 text-sm font-semibold text-accent-600 hover:bg-accent-50"
          >
            <Route size={15} strokeWidth={2} />
            Iniciar ruta completa ({Math.min(stops.length, 10)} paradas)
          </a>
        )}

        {stops.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Orden de entrega</p>
            {stops.map((job, index) => (
              <div key={job.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-surface p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-500 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <button type="button" onClick={() => setViewJobId(job.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-ink">{job.customers?.name ?? 'Sin cliente'}</p>
                  <p className="truncate text-xs text-gray-500">{addressLabel(job)}</p>
                  <p className="text-xs text-gray-400">
                    {job.scheduled_date && formatDate(job.scheduled_date)}
                    {job.time_window_start && ` · ${job.time_window_start.slice(0, 5)}–${job.time_window_end?.slice(0, 5) ?? ''}`}
                    {job.amount != null && ` · ${formatCurrency(job.amount)}`}
                  </p>
                </button>
                {directionsUrl(job) && (
                  <a
                    href={directionsUrl(job)!}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Cómo llegar"
                    className="flex shrink-0 items-center justify-center rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                  >
                    <Navigation size={14} strokeWidth={2} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {viewJobId && (
        <Modal open title="Pedido" onClose={() => setViewJobId(null)}>
          <JobDetailContent id={viewJobId} onBack={() => setViewJobId(null)} backLabel="Cerrar" />
        </Modal>
      )}
    </PageScroll>
  )
}
