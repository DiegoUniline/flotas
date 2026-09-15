import { useEffect, useRef, useState } from 'react'
import { LocateFixed, Search } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useFullscreen } from '@/hooks/useFullscreen'
import { searchAddress, type AddressResult } from '@/lib/geocode'
import { loadGoogleMaps } from '@/lib/googleMaps'
import { FullscreenButton } from '@/components/ui/FullscreenButton'

const MEXICO_CENTER = { lat: 23.6345, lng: -102.5528 }

interface GpsCaptureFieldProps {
  latitude: number | null
  longitude: number | null
  capturedAt: string | null
  onCapture: (latitude: number, longitude: number, capturedAt: string) => void
  label?: string
}

/** Captura la ubicación GPS real del dispositivo al momento de recolectar o
 * entregar un pedido (geolocalización del navegador, mismo mecanismo que
 * "Usar mi ubicación" en domicilios de cliente — no requiere proveedor de
 * rastreo externo). Es una foto puntual, no tracking en vivo. El mapa (real
 * de Google Maps) con pin arrastrable, más el buscador de direcciones
 * (Nominatim, sin costo), permiten corregir o fijar la posición a mano si el
 * GPS del dispositivo se equivocó o no aplica. */
export function GpsCaptureField({ latitude, longitude, capturedAt, onCapture, label = 'Capturar ubicación actual' }: GpsCaptureFieldProps) {
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AddressResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [resultsOpen, setResultsOpen] = useState(false)
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [mapError, setMapError] = useState('')
  const debouncedQuery = useDebouncedValue(query, 400)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const onCaptureRef = useRef(onCapture)
  onCaptureRef.current = onCapture
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(wrapperRef)

  useClickOutside(searchBoxRef, () => setResultsOpen(false), resultsOpen)

  useEffect(() => {
    let cancelled = false
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current || mapRef.current) return
        const map = new maps.maps.Map(containerRef.current, {
          center: latitude != null && longitude != null ? { lat: latitude, lng: longitude } : MEXICO_CENTER,
          zoom: latitude != null && longitude != null ? 15 : 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        })
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return
          onCaptureRef.current(e.latLng.lat(), e.latLng.lng(), new Date().toISOString())
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
      markerRef.current = null
      return
    }

    if (!markerRef.current) {
      const marker = new google.maps.Marker({ position: { lat: latitude, lng: longitude }, map, draggable: true })
      marker.addListener('dragend', () => {
        const pos = marker.getPosition()
        if (pos) onCaptureRef.current(pos.lat(), pos.lng(), new Date().toISOString())
      })
      markerRef.current = marker
    } else {
      markerRef.current.setPosition({ lat: latitude, lng: longitude })
    }
    map.setCenter({ lat: latitude, lng: longitude })
    if ((map.getZoom() ?? 0) < 15) map.setZoom(15)
  }, [latitude, longitude, mapStatus])

  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.trim().length < 3) {
      setResults([])
      setResultsOpen(false)
      return
    }
    let cancelled = false
    setSearching(true)
    setSearchError(null)
    // Se abre desde ya (no solo al tener resultados) para que "Buscando…" y
    // cualquier error de red/CORS sean visibles — antes se guardaban en
    // estado pero el dropdown nunca se abría si la búsqueda fallaba, así
    // que un error real se veía como "no hace nada".
    setResultsOpen(true)
    searchAddress(debouncedQuery)
      .then((found) => {
        if (cancelled) return
        setResults(found)
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
    onCapture(result.lat, result.lng, new Date().toISOString())
    setResultsOpen(false)
    setQuery('')
    setResults([])
  }

  function handleCapture() {
    if (!('geolocation' in navigator)) {
      setError('Tu navegador no soporta geolocalización.')
      return
    }
    setError(null)
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onCapture(position.coords.latitude, position.coords.longitude, new Date().toISOString())
        setLocating(false)
      },
      () => {
        setError('No se pudo obtener la ubicación.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {latitude != null && longitude != null ? (
        <p className="text-sm text-gray-700">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
          {capturedAt && <span className="ml-1.5 text-xs text-gray-400">· {formatDateTime(capturedAt)}</span>}
        </p>
      ) : (
        <p className="text-sm text-gray-400">Sin capturar — busca una dirección o toca el mapa</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCapture}
          disabled={locating}
          className="flex w-fit items-center gap-1.5 text-xs font-medium text-accent-600 hover:text-accent-700 disabled:opacity-50"
        >
          <LocateFixed size={13} strokeWidth={2} />
          {locating ? 'Ubicando…' : label}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}

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

      <div ref={wrapperRef} className="relative h-[420px] w-full overflow-hidden rounded-md border border-gray-200 bg-surface">
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
      {latitude != null && longitude != null && <p className="text-xs text-gray-400">Arrastra el pin o toca el mapa para corregirlo.</p>}
    </div>
  )
}
