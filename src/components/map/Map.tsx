import { useEffect, useRef, useState } from 'react'
import { LocateFixed, Satellite } from 'lucide-react'
import { loadGoogleMaps } from '@/lib/googleMaps'
import { useFullscreen } from '@/hooks/useFullscreen'
import { FullscreenButton } from '@/components/ui/FullscreenButton'

const MEXICO_CENTER = { lat: 23.6345, lng: -102.5528 }

export interface MapMarker {
  id: string
  lat: number
  lng: number
  label: string
  description?: string
  /** Color hex opcional; si se omite usa el pin default de Google Maps. */
  color?: string
  /** Ruta real (p. ej. `/pedidos/:id`) — si se define, el popup del marcador
   * incluye un link "Ver detalle" hacia ahí. */
  href?: string
  /** Anillo animado alrededor del punto — para posiciones en vivo reales
   * (celular del operador compartiendo ubicación), no decorativo en otros
   * casos. */
  pulse?: boolean
  /** Foto real del operador (`drivers.photo_url`) para pintar un avatar
   * circular más grande en vez del punto de color — solo tiene sentido en
   * marcadores de posición en vivo, donde SÍ importa reconocer de un
   * vistazo quién es cada unidad en el mapa. `avatarInitials` es el
   * respaldo cuando no hay foto (mismo criterio de "iniciales como
   * fallback" que el resto de la app). Definir cualquiera de los dos
   * activa el ícono de avatar en vez del punto simple. */
  avatarUrl?: string | null
  avatarInitials?: string
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

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function markerHtml(marker: MapMarker): string {
  if (marker.avatarUrl !== undefined || marker.avatarInitials !== undefined) {
    const color = marker.color ?? '#16a34a'
    const avatarSize = 44
    const size = marker.pulse ? avatarSize + 12 : avatarSize + 4
    const offset = (size - avatarSize) / 2
    const fill = marker.avatarUrl
      ? `background-image:url('${escapeAttr(marker.avatarUrl)}');background-size:cover;background-position:center;`
      : `background:${color};`
    const pulseRing = marker.pulse
      ? `<span class="animate-ping" style="position:absolute;inset:0;border-radius:9999px;background:${color};opacity:0.45"></span>`
      : ''
    return `<span style="position:relative;display:block;width:${size}px;height:${size}px">
        ${pulseRing}
        <span style="position:absolute;top:${offset}px;left:${offset}px;width:${avatarSize}px;height:${avatarSize}px;border-radius:9999px;border:3px solid ${color};${fill}box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:white;overflow:hidden">${
          marker.avatarUrl ? '' : escapeAttr(marker.avatarInitials ?? '')
        }</span>
      </span>`
  }

  if (!marker.color) return ''

  if (!marker.pulse) {
    return `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${marker.color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.2)"></span>`
  }
  const size = 22
  return `<span style="position:relative;display:block;width:${size}px;height:${size}px">
      <span class="animate-ping" style="position:absolute;inset:0;border-radius:9999px;background:${marker.color};opacity:0.6"></span>
      <span style="position:absolute;top:4px;left:4px;width:14px;height:14px;border-radius:9999px;background:${marker.color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.2)"></span>
    </span>`
}

function popupHtml(marker: MapMarker): string {
  let html = `<div style="min-width:140px"><p style="margin:0;font-size:13px;font-weight:600;color:#111827">${escapeAttr(marker.label)}</p>`
  if (marker.description) {
    html += `<p style="margin:2px 0 0;font-size:12px;color:#6b7280">${escapeAttr(marker.description)}</p>`
  }
  if (marker.href) {
    html += `<a href="${escapeAttr(marker.href)}" style="margin-top:4px;display:inline-block;font-size:12px;font-weight:500;color:#863bff;text-decoration:none">Ver detalle →</a>`
  }
  html += '</div>'
  return html
}

/** Marcador HTML libre sobre `OverlayView` — da el mismo control visual que
 * Leaflet `divIcon` (punto de color, anillo animado de "en vivo", avatar
 * circular con foto real) que Google Maps no ofrece de forma nativa sin un
 * Map ID de "Advanced Markers" configurado en Google Cloud. */
class HtmlMarkerOverlay extends google.maps.OverlayView {
  private div: HTMLDivElement | null = null
  private position: google.maps.LatLng
  private html: string
  private onClick?: () => void

  constructor(position: google.maps.LatLng, html: string, onClick?: () => void) {
    super()
    this.position = position
    this.html = html
    this.onClick = onClick
  }

  override onAdd() {
    const div = document.createElement('div')
    div.style.position = 'absolute'
    div.style.transform = 'translate(-50%, -50%)'
    div.innerHTML = this.html
    if (this.onClick) {
      div.style.cursor = 'pointer'
      div.addEventListener('click', (e) => {
        e.stopPropagation()
        this.onClick?.()
      })
    }
    this.div = div
    this.getPanes()?.overlayMouseTarget.appendChild(div)
  }

  override draw() {
    if (!this.div) return
    const projection = this.getProjection()
    const point = projection?.fromLatLngToDivPixel(this.position)
    if (point) {
      this.div.style.left = `${point.x}px`
      this.div.style.top = `${point.y}px`
    }
  }

  override onRemove() {
    this.div?.remove()
    this.div = null
  }
}

export function Map({ markers, className = '', polyline, polylineColor = '#f97316', onMarkerClick }: MapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const overlaysRef = useRef<HtmlMarkerOverlay[]>([])
  const pinMarkersRef = useRef<google.maps.Marker[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const onMarkerClickRef = useRef(onMarkerClick)
  onMarkerClickRef.current = onMarkerClick

  const [satellite, setSatellite] = useState(false)
  const [locating, setLocating] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(wrapperRef)

  useEffect(() => {
    let cancelled = false
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current || mapRef.current) return
        const map = new maps.maps.Map(containerRef.current, {
          center: MEXICO_CENTER,
          zoom: 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        })
        mapRef.current = map
        infoWindowRef.current = new maps.maps.InfoWindow()
        setStatus('ready')
      })
      .catch((err: Error) => {
        if (cancelled) return
        setErrorMessage(err.message)
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    mapRef.current?.setMapTypeId(satellite ? 'satellite' : 'roadmap')
  }, [satellite])

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return

    for (const overlay of overlaysRef.current) overlay.setMap(null)
    overlaysRef.current = []
    for (const pin of pinMarkersRef.current) pin.setMap(null)
    pinMarkersRef.current = []
    polylineRef.current?.setMap(null)
    polylineRef.current = null

    if (markers.length === 0) return

    for (const marker of markers) {
      const position = new google.maps.LatLng(marker.lat, marker.lng)
      const handleClick = () => {
        infoWindowRef.current?.setContent(popupHtml(marker))
        infoWindowRef.current?.setPosition(position)
        infoWindowRef.current?.open(map)
        onMarkerClickRef.current?.(marker)
      }

      const html = markerHtml(marker)
      if (html) {
        const overlay = new HtmlMarkerOverlay(position, html, handleClick)
        overlay.setMap(map)
        overlaysRef.current.push(overlay)
      } else {
        const pin = new google.maps.Marker({ position, map })
        pin.addListener('click', handleClick)
        pinMarkersRef.current.push(pin)
      }
    }

    if (polyline && polyline.length > 1) {
      polylineRef.current = new google.maps.Polyline({
        path: polyline,
        strokeOpacity: 0,
        icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeColor: polylineColor, scale: 4 }, offset: '0', repeat: '18px' }],
        map,
      })
    }

    const bounds = new google.maps.LatLngBounds()
    for (const marker of markers) bounds.extend({ lat: marker.lat, lng: marker.lng })
    map.fitBounds(bounds, 48)
    const listener = google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
      if (markers.length === 1 && map.getZoom()! > 15) map.setZoom(15)
    })
    return () => google.maps.event.removeListener(listener)
  }, [markers, polyline, polylineColor, status])

  function handleLocate() {
    const map = mapRef.current
    if (!map || !('geolocation' in navigator)) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.setCenter({ lat: position.coords.latitude, lng: position.coords.longitude })
        map.setZoom(15)
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div ref={wrapperRef} className={`relative bg-white ${className}`}>
      <div ref={containerRef} className="h-full w-full" />

      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 p-4 text-center">
          <p className="text-sm text-gray-500">{errorMessage}</p>
        </div>
      )}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <p className="text-sm text-gray-400">Cargando mapa…</p>
        </div>
      )}

      {status === 'ready' && (
        <>
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
          <div className="absolute bottom-2.5 right-2.5 z-[1000] flex flex-col gap-1.5">
            <FullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
            <button
              type="button"
              onClick={handleLocate}
              disabled={locating}
              title="Mi ubicación"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <LocateFixed size={15} strokeWidth={2} className={locating ? 'animate-pulse' : ''} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
