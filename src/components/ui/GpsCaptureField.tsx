import { useState } from 'react'
import { LocateFixed } from 'lucide-react'
import { formatDateTime } from '@/lib/format'

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
 * rastreo externo). Es una foto puntual, no tracking en vivo. */
export function GpsCaptureField({ latitude, longitude, capturedAt, onCapture, label = 'Capturar ubicación actual' }: GpsCaptureFieldProps) {
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <div className="flex flex-col gap-1">
      {latitude != null && longitude != null ? (
        <p className="text-sm text-gray-700">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
          {capturedAt && <span className="ml-1.5 text-xs text-gray-400">· {formatDateTime(capturedAt)}</span>}
        </p>
      ) : (
        <p className="text-sm text-gray-400">Sin capturar</p>
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
    </div>
  )
}
