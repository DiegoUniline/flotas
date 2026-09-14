import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import '@/lib/leafletIconFix'
import { Search } from 'lucide-react'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { searchAddress, type AddressResult } from '@/lib/geocode'

const MEXICO_CENTER: [number, number] = [23.6345, -102.5528]

interface GeofenceMapFieldProps {
  latitude: number | null
  longitude: number | null
  radiusMeters: number
  color: string
  onChangeCenter: (latitude: number, longitude: number) => void
}

/** Mapa con un círculo (centro arrastrable + radio en metros) para definir
 * una geocerca — mismo patrón de `GpsCaptureField` (buscador de dirección
 * con Nominatim, click en el mapa reposiciona) pero dibuja un `L.circle`
 * en vez de solo un pin, porque una geocerca es una zona, no un punto. */
export function GeofenceMapField({ latitude, longitude, radiusMeters, color, onChangeCenter }: GeofenceMapFieldProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AddressResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [resultsOpen, setResultsOpen] = useState(false)
  const debouncedQuery = useDebouncedValue(query, 400)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const onChangeCenterRef = useRef(onChangeCenter)
  onChangeCenterRef.current = onChangeCenter

  useClickOutside(searchBoxRef, () => setResultsOpen(false), resultsOpen)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, { zoomControl: true }).setView(
      latitude != null && longitude != null ? [latitude, longitude] : MEXICO_CENTER,
      latitude != null && longitude != null ? 14 : 5,
    )
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    map.on('click', (e: L.LeafletMouseEvent) => {
      onChangeCenterRef.current(e.latlng.lat, e.latlng.lng)
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
      circleRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (latitude == null || longitude == null) {
      markerRef.current?.remove()
      circleRef.current?.remove()
      markerRef.current = null
      circleRef.current = null
      return
    }

    if (!markerRef.current) {
      markerRef.current = L.marker([latitude, longitude], { draggable: true }).addTo(map)
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current!.getLatLng()
        onChangeCenterRef.current(pos.lat, pos.lng)
      })
    } else {
      markerRef.current.setLatLng([latitude, longitude])
    }

    if (!circleRef.current) {
      circleRef.current = L.circle([latitude, longitude], {
        radius: radiusMeters,
        color,
        fillColor: color,
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map)
    } else {
      circleRef.current.setLatLng([latitude, longitude])
      circleRef.current.setRadius(radiusMeters)
      circleRef.current.setStyle({ color, fillColor: color })
    }

    map.invalidateSize()
    map.fitBounds(circleRef.current.getBounds(), { maxZoom: 16 })
  }, [latitude, longitude, radiusMeters, color])

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
          <div className="absolute left-0 top-full z-30 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
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

      <div ref={containerRef} className="h-[380px] w-full rounded-md border border-gray-200" />
      {latitude != null && longitude != null && <p className="text-xs text-gray-400">Arrastra el pin o toca el mapa para mover el centro.</p>}
    </div>
  )
}
