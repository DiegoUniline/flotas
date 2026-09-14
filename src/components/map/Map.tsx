import { useEffect, useRef } from 'react'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Vite bundles marker images under a hashed URL; Leaflet's default icon
// lookup assumes a relative path that breaks once bundled.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const MEXICO_CENTER: [number, number] = [23.6345, -102.5528]

export interface MapMarker {
  id: string
  lat: number
  lng: number
  label: string
  description?: string
}

interface MapProps {
  markers: MapMarker[]
  className?: string
}

export function Map({ markers, className = '' }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current).setView(MEXICO_CENTER, 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()
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
      L.marker([marker.lat, marker.lng]).addTo(layer).bindPopup(popup)
    }

    const bounds = L.latLngBounds(markers.map((marker) => [marker.lat, marker.lng]))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 })
  }, [markers])

  return <div ref={containerRef} className={className} />
}
