import { LocateFixed, Navigation, Truck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageScroll } from '@/components/ui/PageScroll'
import { Map } from '@/components/map/Map'
import { formatDateTime } from '@/lib/format'
import { useMyDriverProfile, useShareLocation } from '@/features/tracking/hooks/useTracking'

/** Página para el celular del operador: comparte su ubicación real
 * (geolocalización del navegador) mientras trabaja su ruta — decisión del
 * usuario de usar el celular en vez de un dispositivo GPS dedicado. No es
 * tracking en segundo plano ni una app nativa: solo funciona mientras esta
 * pestaña sigue abierta y con permiso de ubicación otorgado. */
export function MiUbicacionPage() {
  const profileQuery = useMyDriverProfile()
  const { sharing, error, lastSentAt, lastCoords, start, stop } = useShareLocation()

  if (profileQuery.isLoading) {
    return (
      <PageScroll>
        <div className="p-6">
          <Skeleton className="h-40" />
        </div>
      </PageScroll>
    )
  }

  const profile = profileQuery.data

  return (
    <PageScroll>
      <div className="mx-auto flex max-w-md flex-col gap-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-ink">Mi ubicación</h1>
          <p className="text-sm text-gray-500">Comparte tu ubicación real mientras trabajas tu ruta del día.</p>
        </div>

        {!profile ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
            Tu cuenta no está vinculada a un operador — solo los operadores pueden compartir ubicación.
          </div>
        ) : !profile.vehicle ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
            Hola {profile.driverName}. Todavía no tienes un vehículo asignado, así que no hay a quién guardarle la posición.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                <Truck size={18} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{profile.driverName}</p>
                <p className="truncate text-xs text-gray-500">Vehículo asignado: {profile.vehicle.label}</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 text-center">
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full ${sharing ? 'bg-status-active-bg text-status-active' : 'bg-gray-100 text-gray-400'}`}
              >
                <Navigation size={24} strokeWidth={2} className={sharing ? 'animate-pulse' : ''} />
              </span>
              <p className="text-sm font-medium text-ink">{sharing ? 'Compartiendo tu ubicación' : 'Ubicación detenida'}</p>
              <p className="text-xs text-gray-500">
                {lastSentAt ? `Última posición guardada: ${formatDateTime(lastSentAt)}` : 'Aún no se ha guardado ninguna posición.'}
              </p>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <Button onClick={sharing ? stop : start} variant={sharing ? 'danger' : 'primary'} className="w-full">
                <LocateFixed size={15} strokeWidth={2} />
                {sharing ? 'Dejar de compartir' : 'Compartir mi ubicación'}
              </Button>
              <p className="text-xs text-gray-400">
                Se guarda cada ~15 segundos mientras esta pantalla está abierta y diste permiso de ubicación al navegador.
              </p>
            </div>

            {lastCoords && (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <Map
                  className="h-64 w-full"
                  markers={[{ id: 'me', lat: lastCoords.lat, lng: lastCoords.lng, label: profile.driverName, color: '#16a34a' }]}
                />
              </div>
            )}
          </>
        )}
      </div>
    </PageScroll>
  )
}
