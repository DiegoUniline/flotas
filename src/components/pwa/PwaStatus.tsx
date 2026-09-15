import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000

/** Montado una sola vez en `App.tsx`, fuera del árbol protegido — así el
 * aviso de "sin conexión" y el de "hay una versión nueva" se ven en
 * cualquier pantalla, con o sin sesión iniciada. `useRegisterSW` registra
 * el service worker generado por `vite-plugin-pwa` (ver vite.config.ts) y
 * expone cuándo ya quedó todo cacheado para funcionar sin conexión
 * (`offlineReady`) y cuándo hay una versión nueva esperando activarse
 * (`needRefresh` — un service worker nuevo no reemplaza al viejo hasta que
 * se le pide explícitamente, para no cambiarle el código a una pestaña ya
 * abierta a medio uso). */
export function PwaStatus() {
  const online = useOnlineStatus()
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const interval = setInterval(() => void registration.update(), UPDATE_CHECK_INTERVAL_MS)
      return () => clearInterval(interval)
    },
  })

  useEffect(() => {
    if (!offlineReady) return
    const timeout = setTimeout(() => setOfflineReady(false), 4000)
    return () => clearTimeout(timeout)
  }, [offlineReady, setOfflineReady])

  if (!online || needRefresh || offlineReady) {
    return (
      <div className="fixed left-1/2 top-3 z-[1300] flex -translate-x-1/2 flex-col items-center gap-2 px-4">
        {!online && (
          <div className="flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
            <WifiOff size={15} strokeWidth={2} />
            Sin conexión — tus cambios se guardan y se sincronizan solos al reconectar.
          </div>
        )}
        {needRefresh && (
          <div className="flex items-center gap-3 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">
            <RefreshCw size={15} strokeWidth={2} />
            Hay una versión nueva de FLOTAA.
            <button
              type="button"
              onClick={() => void updateServiceWorker(true)}
              className="rounded-full bg-white/15 px-2.5 py-1 font-medium hover:bg-white/25"
            >
              Actualizar
            </button>
            <button type="button" onClick={() => setNeedRefresh(false)} className="text-white/70 hover:text-white" aria-label="Cerrar">
              ×
            </button>
          </div>
        )}
        {offlineReady && (
          <div className="rounded-full bg-status-active px-4 py-2 text-sm font-medium text-white shadow-lg">
            Lista para funcionar sin conexión.
          </div>
        )}
      </div>
    )
  }

  return null
}
