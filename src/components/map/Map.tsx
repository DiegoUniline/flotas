import { useEffect, useRef } from 'react'
import L from 'leaflet'
import '@/lib/leafletIconFix'

const MEXICO_CENTER: [number, number] = [23.6345, -102.5528]

export interface MapMarker {
  id: string
  lat: number
  lng: number
  label: string
  description?: string
  /** Color hex opcional; si se omite usa el pin default de Leaflet. */
  color?: string
}

interface MapProps {
  markers: MapMarker[]
  className?: string
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
      const leafletMarker = marker.color
        ? L.marker([marker.lat, marker.lng], { icon: coloredDivIcon(marker.color) })
        : L.marker([marker.lat, marker.lng])
      leafletMarker.addTo(layer).bindPopup(popup)
    }

    const bounds = L.latLngBounds(markers.map((marker) => [marker.lat, marker.lng]))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 })
  }, [markers])

  return <div ref={containerRef} className={className} />
}
