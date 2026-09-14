import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import '@/lib/leafletIconFix'
import { LocateFixed, Search } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const MEXICO_CENTER: [number, number] = [23.6345, -102.5528]

interface GpsCaptureFieldProps {
  latitude: number | null
  longitude: number | null
  capturedAt: string | null
  onCapture: (latitude: number, longitude: number, capturedAt: string) => void
  label?: string
}

interface AddressResult {
  label: string
  lat: number
  lng: number
}

/** Busca una dirección/estado/municipio con Nominatim (geocodificador
 * gratuito de OpenStreetMap, sin API key — mismo criterio que los tiles del
 * mapa). Uso ligero, propio de un formulario; si el volumen crece revisar
 * la política de uso de Nominatim (~1 req/seg) o migrar a un proveedor con
 * cuota (p. ej. Mapbox/Google) — no se hizo esa evaluación en esta fase. */
async function searchAddress(query: string): Promise<AddressResult[]> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    q: query,
    countrycodes: 'mx',
    limit: '6',
    addressdetails: '0',
  })
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: 'application/json', 'Accept-Language': 'es' },
  })
  if (!response.ok) throw new Error(`Nominatim respondió ${response.status} ${response.statusText}`)
  const data = (await response.json()) as { display_name: string; lat: string; lon: string }[]
  return data.map((r) => ({ label: r.display_name, lat: Number(r.lat), lng: Number(r.lon) }))
}

/** Captura la ubicación GPS real del dispositivo al momento de recolectar o
 * entregar un pedido (geolocalización del navegador, mismo mecanismo que
 * "Usar mi ubicación" en domicilios de cliente — no requiere proveedor de
 * rastreo externo). Es una foto puntual, no tracking en vivo. El mapa con
 * pin arrastrable, más el buscador de direcciones, permiten corregir o fijar
 * la posición a mano si el GPS del dispositivo se equivocó o no aplica. */
export function GpsCaptureField({ latitude, longitude, capturedAt, onCapture, label = 'Capturar ubicación actual' }: GpsCaptureFieldProps) {
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AddressResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [resultsOpen, setResultsOpen] = useState(false)
  const debouncedQuery = useDebouncedValue(query, 400)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onCaptureRef = useRef(onCapture)
  onCaptureRef.current = onCapture

  useClickOutside(searchBoxRef, () => setResultsOpen(false), resultsOpen)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, { zoomControl: true }).setView(
      latitude != null && longitude != null ? [latitude, longitude] : MEXICO_CENTER,
      latitude != null && longitude != null ? 15 : 5,
    )
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    if (latitude != null && longitude != null) {
      markerRef.current = L.marker([latitude, longitude], { draggable: true }).addTo(map)
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current!.getLatLng()
        onCaptureRef.current(pos.lat, pos.lng, new Date().toISOString())
      })
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      onCaptureRef.current(e.latlng.lat, e.latlng.lng, new Date().toISOString())
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (latitude == null || longitude == null) {
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      return
    }

    if (!markerRef.current) {
      markerRef.current = L.marker([latitude, longitude], { draggable: true }).addTo(map)
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current!.getLatLng()
        onCaptureRef.current(pos.lat, pos.lng, new Date().toISOString())
      })
    } else {
      markerRef.current.setLatLng([latitude, longitude])
    }
    map.setView([latitude, longitude], Math.max(map.getZoom(), 15))
    // También recalcula el tamaño del mapa por si el contenedor cambió de tamaño entre renders.
    map.invalidateSize()
  }, [latitude, longitude])

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

      <div ref={containerRef} className="h-[420px] w-full rounded-md border border-gray-200" />
      {latitude != null && longitude != null && <p className="text-xs text-gray-400">Arrastra el pin o toca el mapa para corregirlo.</p>}
    </div>
  )
}
