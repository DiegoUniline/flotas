import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { fetchMyDriverProfile, updateMyVehiclePosition } from '@/features/tracking/api/trackingApi'

const SEND_INTERVAL_MS = 15000

export function useMyDriverProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['my-driver-profile', user?.id],
    queryFn: () => fetchMyDriverProfile(user!.id),
    enabled: !!user,
  })
}

/** Comparte la ubicación real del celular del operador cada ~15s mientras
 * está activo, usando `navigator.geolocation.watchPosition` (mismo
 * mecanismo que "Usar mi ubicación"/GPS de recolección, no un SDK nuevo).
 * El throttle vive en un ref porque `watchPosition` puede disparar el
 * callback mucho más seguido que cada 15s. */
export function useShareLocation() {
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSentAt, setLastSentAt] = useState<string | null>(null)
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number } | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastSentAtRef = useRef(0)

  const mutation = useMutation({
    mutationFn: ({ lat, lng }: { lat: number; lng: number }) => updateMyVehiclePosition(lat, lng),
    onSuccess: () => setLastSentAt(new Date().toISOString()),
    onError: () => setError('No se pudo guardar tu posición. Se seguirá intentando.'),
  })

  function start() {
    if (!('geolocation' in navigator)) {
      setError('Tu navegador no soporta geolocalización.')
      return
    }
    setError(null)
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setLastCoords({ lat: latitude, lng: longitude })
        const now = Date.now()
        if (now - lastSentAtRef.current >= SEND_INTERVAL_MS) {
          lastSentAtRef.current = now
          mutation.mutate({ lat: latitude, lng: longitude })
        }
      },
      () => setError('No se pudo obtener tu ubicación. Revisa los permisos de ubicación del navegador.'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    )
    watchIdRef.current = id
    setSharing(true)
  }

  function stop() {
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
    watchIdRef.current = null
    setSharing(false)
  }

  useEffect(
    () => () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
    },
    [],
  )

  return { sharing, error, lastSentAt, lastCoords, start, stop }
}
