import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useFullscreen } from '@/hooks/useFullscreen'
import { searchAddress, type AddressResult } from '@/lib/geocode'
import { loadGoogleMaps } from '@/lib/googleMaps'
import { FullscreenButton } from '@/components/ui/FullscreenButton'

const MEXICO_CENTER = { lat: 23.6345, lng: -102.5528 }

interface GeofenceMapFieldProps {
  latitude: number | null
  longitude: number | null
  radiusMeters: number
  color: string
  onChangeCenter: (latitude: number, longitude: number) => void
}

/** Mapa (real de Google Maps) con un círculo (centro arrastrable + radio en
 * metros) para definir una geocerca — mismo patrón de `GpsCaptureField`
 * (buscador de dirección con Nominatim, click en el mapa reposiciona) pero
 * dibuja un `google.maps.Circle` en vez de solo un pin, porque una geocerca
 * es una zona, no un punto. */
export function GeofenceMapField({ latitude, longitude, radiusMeters, color, onChangeCenter }: GeofenceMapFieldProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AddressResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [resultsOpen, setResultsOpen] = useState(false)
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [mapError, setMapError] = useState('')
  const debouncedQuery = useDebouncedValue(query, 400)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const circleRef = useRef<google.maps.Circle | null>(null)
  const onChangeCenterRef = useRef(onChangeCenter)
  onChangeCenterRef.current = onChangeCenter
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(wrapperRef)

  useClickOutside(searchBoxRef, () => setResultsOpen(false), resultsOpen)

  useEffect(() => {
    let cancelled = false
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current || mapRef.current) return
        const map = new maps.maps.Map(containerRef.current, {
          center: latitude != null && longitude != null ? { lat: latitude, lng: longitude } : MEXICO_CENTER,
          zoom: latitude != null && longitude != null ? 14 : 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        })
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return
          onChangeCenterRef.current(e.latLng.lat(), e.latLng.lng())
        })
        mapRef.current = map
        setMapStatus('ready')
      })
      .catch((err: Error) => {
        if (cancelled) return
        setMapError(err.message)
        setMapStatus('error')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || mapStatus !== 'ready') return

    if (latitude == null || longitude == null) {
      markerRef.current?.setMap(null)
      circleRef.current?.setMap(null)
      markerRef.current = null
      circleRef.current = null
      return
    }

    const position = { lat: latitude, lng: longitude }

    if (!markerRef.current) {
      const marker = new google.maps.Marker({ position, map, draggable: true })
      marker.addListener('dragend', () => {
        const pos = marker.getPosition()
        if (pos) onChangeCenterRef.current(pos.lat(), pos.lng())
      })
      markerRef.current = marker
    } else {
      markerRef.current.setPosition(position)
    }

    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        center: position,
        radius: radiusMeters,
        strokeColor: color,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.15,
        map,
      })
    } else {
      circleRef.current.setCenter(position)
      circleRef.current.setRadius(radiusMeters)
      circleRef.current.setOptions({ strokeColor: color, fillColor: color })
    }

    const bounds = circleRef.current.getBounds()
    if (bounds) map.fitBounds(bounds, 16)
  }, [latitude, longitude, radiusMeters, color, mapStatus])

  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.trim().length < 3) {
      setResults([])
      setResultsOpen(false)
      return
    }
    let cancelled = false
    setSearching(true)
    setSearchError(null)
    setResultsOpen(true)
    searchAddress(debouncedQuery)
      .then((found) => {
        if (!cancelled) setResults(found)
      })
      .catch((err) => {
        console.error('Error buscando dirección:', err)
        if (!cancelled) setSearchError('No se pudo buscar. Verifica tu conexión e intenta de nuevo.')
      })
      .finally(() => {
        if (!cancelled) setSearching(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  function handleSelectResult(result: AddressResult) {
    onChangeCenter(result.lat, result.lng)
    setResultsOpen(false)
    setQuery('')
    setResults([])
  }

  return (
    <div className="flex flex-col gap-1.5">
      {latitude != null && longitude != null ? (
        <p className="text-sm text-gray-700">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </p>
      ) : (
        <p className="text-sm text-gray-400">Sin centro definido — busca una dirección o toca el mapa</p>
      )}

      <div ref={searchBoxRef} className="relative">
        <div className="relative">
          <Search size={14} strokeWidth={2} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setResultsOpen(true)}
            placeholder="Buscar dirección, colonia, municipio o estado…"
            className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-2.5 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
        </div>
        {resultsOpen && (
          <div className="absolute left-0 top-full z-30 mt-1 w-full rounded-md border border-gray-200 bg-surface shadow-lg">
            {searching ? (
              <p className="px-3 py-2 text-sm text-gray-400">Buscando…</p>
            ) : searchError ? (
              <p className="px-3 py-2 text-sm text-red-600">{searchError}</p>
            ) : results.length > 0 ? (
              <ul className="max-h-56 overflow-y-auto py-1">
                {results.map((result, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => handleSelectResult(result)}
                      className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {result.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-2 text-sm text-gray-400">Sin resultados</p>
            )}
          </div>
        )}
      </div>

      <div ref={wrapperRef} className="relative h-[380px] w-full overflow-hidden rounded-md border border-gray-200 bg-surface">
        <div ref={containerRef} className="h-full w-full" />
        {mapStatus === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-500">{mapError}</p>
          </div>
        )}
        {mapStatus === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <p className="text-sm text-gray-400">Cargando mapa…</p>
          </div>
        )}
        {mapStatus === 'ready' && (
          <FullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} className="absolute bottom-2.5 right-2.5 z-[1000]" />
        )}
      </div>
      {latitude != null && longitude != null && <p className="text-xs text-gray-400">Arrastra el pin o toca el mapa para mover el centro.</p>}
    </div>
  )
}
