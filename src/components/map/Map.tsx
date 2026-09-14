import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import '@/lib/leafletIconFix'
import { LocateFixed, Satellite } from 'lucide-react'

const MEXICO_CENTER: [number, number] = [23.6345, -102.5528]

export interface MapMarker {
  id: string
  lat: number
  lng: number
  label: string
  description?: string
  /** Color hex opcional; si se omite usa el pin default de Leaflet. */
  color?: string
  /** Ruta real (p. ej. `/pedidos/:id`) — si se define, el popup del marcador
   * incluye un link "Ver detalle" hacia ahí. */
  href?: string
}

interface MapProps {
  markers: MapMarker[]
  className?: string
  /** Línea que conecta las paradas de una ruta en secuencia (datos reales, no tracking en vivo). */
  polyline?: { lat: number; lng: number }[]
  polylineColor?: string
  /** Se dispara al hacer click en un marcador, además de abrir su popup. */
  onMarkerClick?: (marker: MapMarker) => void
}

function coloredDivIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.2)"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -7],
  })
}

const STREET_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const STREET_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
// Esri World Imagery: mosaico satelital gratuito sin API key, mismo criterio que OSM.
const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const SATELLITE_ATTRIBUTION = 'Tiles &copy; Esri'

export function Map({ markers, className = '', polyline, polylineColor = '#f97316', onMarkerClick }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const polylineRef = useRef<L.Polyline | null>(null)
  const streetLayerRef = useRef<L.TileLayer | null>(null)
  const satelliteLayerRef = useRef<L.TileLayer | null>(null)
  const [satellite, setSatellite] = useState(false)
  const [locating, setLocating] = useState(false)
  const onMarkerClickRef = useRef(onMarkerClick)
  onMarkerClickRef.current = onMarkerClick

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current).setView(MEXICO_CENTER, 5)
    streetLayerRef.current = L.tileLayer(STREET_TILES, { attribution: STREET_ATTRIBUTION, maxZoom: 19 }).addTo(map)
    satelliteLayerRef.current = L.tileLayer(SATELLITE_TILES, { attribution: SATELLITE_ATTRIBUTION, maxZoom: 19 })
    L.control.scale({ imperial: false, position: 'bottomright' }).addTo(map)

    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
      streetLayerRef.current = null
      satelliteLayerRef.current = null
      polylineRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const street = streetLayerRef.current
    const sat = satelliteLayerRef.current
    if (!map || !street || !sat) return
    if (satellite) {
      map.removeLayer(street)
      sat.addTo(map)
    } else {
      map.removeLayer(sat)
      street.addTo(map)
    }
  }, [satellite])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()
    if (polylineRef.current) {
      polylineRef.current.remove()
      polylineRef.current = null
    }
    if (markers.length === 0) return

    for (const marker of markers) {
      const popup = document.createElement('div')
      const title = document.createElement('p')
      title.className = 'text-sm font-semibold text-gray-900'
      title.textContent = marker.label
      popup.appendChild(title)
      if (marker.description) {
        const description = document.createElement('p')
        description.className = 'text-xs text-gray-500'
        description.textContent = marker.description
        popup.appendChild(description)
      }
      if (marker.href) {
        const link = document.createElement('a')
        link.href = marker.href
        link.textContent = 'Ver detalle →'
        link.className = 'mt-1 inline-block text-xs font-medium text-accent-600 hover:text-accent-700'
        popup.appendChild(link)
      }
      const leafletMarker = marker.color
        ? L.marker([marker.lat, marker.lng], { icon: coloredDivIcon(marker.color) })
        : L.marker([marker.lat, marker.lng])
      leafletMarker.addTo(layer).bindPopup(popup)
      leafletMarker.on('click', () => onMarkerClickRef.current?.(marker))
    }

    if (polyline && polyline.length > 1) {
      polylineRef.current = L.polyline(
        polyline.map((p) => [p.lat, p.lng]),
        { color: polylineColor, weight: 3, opacity: 0.7, dashArray: '6 6' },
      ).addTo(map)
    }

    const bounds = L.latLngBounds(markers.map((marker) => [marker.lat, marker.lng]))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 })
  }, [markers, polyline, polylineColor])

  function handleLocate() {
    const map = mapRef.current
    if (!map || !('geolocation' in navigator)) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.setView([position.coords.latitude, position.coords.longitude], 15)
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute left-2.5 top-2.5 z-[1000] flex overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setSatellite(false)}
          className={`px-2.5 py-1.5 text-xs font-medium ${!satellite ? 'bg-accent-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          Mapa
        </button>
        <button
          type="button"
          onClick={() => setSatellite(true)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium ${satellite ? 'bg-accent-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          <Satellite size={12} strokeWidth={2} />
          Satélite
        </button>
      </div>
      <button
        type="button"
        onClick={handleLocate}
        disabled={locating}
        title="Mi ubicación"
        className="absolute bottom-9 right-2.5 z-[1000] flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-50"
      >
        <LocateFixed size={15} strokeWidth={2} className={locating ? 'animate-pulse' : ''} />
      </button>
    </div>
  )
}
