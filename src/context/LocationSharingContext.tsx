import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { fetchMyDriverProfile, updateMyVehiclePosition, type MyDriverProfile } from '@/features/tracking/api/trackingApi'

const SEND_INTERVAL_MS = 15000

interface LocationSharingState {
  driverProfile: MyDriverProfile | null | undefined
  driverProfileLoading: boolean
  sharing: boolean
  error: string | null
  lastSentAt: string | null
  lastCoords: { lat: number; lng: number } | null
  start: () => void
  stop: () => void
}

const LocationSharingContext = createContext<LocationSharingState | null>(null)

/** Vive a nivel de `AppShell` (no de una página) a propósito: antes el watch
 * de geolocalización estaba atado al ciclo de vida de `MiUbicacionPage`, así
 * que navegar a "Mis pedidos" o cualquier otra pantalla desmontaba el
 * componente y detenía silenciosamente el envío de posición — el operador
 * creía que seguía compartiendo, pero la señal se cortaba en cuanto salía de
 * esa pantalla. Al montar el provider una sola vez por sesión (sobrevive a
 * cualquier navegación interna de React Router), "Compartir mi ubicación"
 * sigue enviando cada ~15s aunque el operador esté viendo sus pedidos o el
 * mapa — solo se detiene con "Dejar de compartir", cerrar sesión o cerrar la
 * pestaña. */
export function LocationSharingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const profileQuery = useQuery({
    queryKey: ['my-driver-profile', user?.id],
    queryFn: () => fetchMyDriverProfile(user!.id),
    enabled: !!user,
  })

  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSentAt, setLastSentAt] = useState<string | null>(null)
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number } | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastSentAtRef = useRef(0)

  const mutation = useMutation({
    mutationFn: ({ lat, lng }: { lat: number; lng: number }) => updateMyVehiclePosition(lat, lng),
    onSuccess: () => {
      setLastSentAt(new Date().toISOString())
      setError(null)
    },
    onError: (err: Error) => setError(err.message || 'No se pudo guardar tu posición. Se seguirá intentando.'),
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

  // Si cierra sesión con el envío activo, se detiene — no debe seguir
  // mandando posición a nombre de nadie.
  useEffect(() => {
    if (!user && watchIdRef.current != null) stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(
    () => () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
    },
    [],
  )

  return (
    <LocationSharingContext.Provider
      value={{
        driverProfile: profileQuery.data,
        driverProfileLoading: profileQuery.isLoading,
        sharing,
        error,
        lastSentAt,
        lastCoords,
        start,
        stop,
      }}
    >
      {children}
    </LocationSharingContext.Provider>
  )
}

export function useLocationSharing() {
  const ctx = useContext(LocationSharingContext)
  if (!ctx) throw new Error('useLocationSharing debe usarse dentro de LocationSharingProvider')
  return ctx
}
