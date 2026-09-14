import { Building2, MapPin, MapPinOff } from 'lucide-react'
import { Map } from '@/components/map/Map'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { LOCATION_TYPES } from '@/features/locations/api/locationsApi'
import { useLocationCounts, useMappedLocations } from './hooks/useControlMap'

const LOCATION_TYPE_LABELS = Object.fromEntries(LOCATION_TYPES.map((t) => [t.value, t.label]))

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Building2
  label: string
  value: number
  tone: 'accent' | 'green' | 'gray'
}) {
  const toneClasses = {
    accent: 'bg-accent-50 text-accent-600',
    green: 'bg-status-active-bg text-status-active',
    gray: 'bg-gray-100 text-gray-500',
  }[tone]

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${toneClasses}`}>
        <Icon size={18} strokeWidth={2} />
      </span>
      <div>
        <p className="text-lg font-semibold leading-tight text-ink">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export function ControlMapPage() {
  const mappedQuery = useMappedLocations()
  const countsQuery = useLocationCounts()

  const withoutCoordinates =
    countsQuery.data && mappedQuery.data ? countsQuery.data.total - mappedQuery.data.length : 0

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Centro de control</h1>
        <p className="text-sm text-gray-500">Ubicación de tus sucursales.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {countsQuery.isLoading ? (
          <>
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </>
        ) : (
          <>
            <StatCard icon={Building2} label="Sucursales" value={countsQuery.data?.total ?? 0} tone="accent" />
            <StatCard icon={MapPin} label="Activas" value={countsQuery.data?.active ?? 0} tone="green" />
            <StatCard icon={MapPinOff} label="Sin coordenadas" value={withoutCoordinates} tone="gray" />
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {mappedQuery.isError ? (
          <ErrorState message="No se pudo cargar el mapa." onRetry={() => void mappedQuery.refetch()} />
        ) : mappedQuery.isLoading ? (
          <Skeleton className="h-[520px]" />
        ) : mappedQuery.data && mappedQuery.data.length > 0 ? (
          <Map
            className="h-[520px] w-full"
            markers={mappedQuery.data.map((location) => ({
              id: location.id,
              lat: location.latitude,
              lng: location.longitude,
              label: location.name,
              description: [LOCATION_TYPE_LABELS[location.location_type] ?? location.location_type, location.city]
                .filter(Boolean)
                .join(' · '),
            }))}
          />
        ) : (
          <EmptyState
            title="Ninguna sucursal tiene coordenadas"
            description="Agrega latitud y longitud en cada sucursal para verla aquí en el mapa."
          />
        )}
      </div>
    </div>
  )
}
