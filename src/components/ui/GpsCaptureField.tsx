import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import '@/lib/leafletIconFix'
import { LocateFixed } from 'lucide-react'
import { formatDateTime } from '@/lib/format'

const MEXICO_CENTER: [number, number] = [23.6345, -102.5528]

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
 * rastreo externo). Es una foto puntual, no tracking en vivo. El mapa con
 * pin arrastrable permite corregir la posición a mano si el GPS del
 * dispositivo se equivocó. */
export function GpsCaptureField({ latitude, longitude, capturedAt, onCapture, label = 'Capturar ubicación actual' }: GpsCaptureFieldProps) {
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onCaptureRef = useRef(onCapture)
  onCaptureRef.current = onCapture

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
  }, [latitude, longitude])

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
        <p className="text-sm text-gray-400">Sin capturar — toca el mapa para colocar el pin</p>
      )}
      <button
        type="button"
        onClick={handleCapture}
        disabled={locating}
        className="flex w-fit items-center gap-1.5 text-xs font-medium text-accent-600 hover:text-accent-700 disabled:opacity-50"
      >
        <LocateFixed size={13} strokeWidth={2} />
        {locating ? 'Ubicando…' : label}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div ref={containerRef} className="h-40 w-full rounded-md border border-gray-200" />
      {latitude != null && longitude != null && <p className="text-xs text-gray-400">Arrastra el pin o toca el mapa para corregirlo.</p>}
    </div>
  )
}
