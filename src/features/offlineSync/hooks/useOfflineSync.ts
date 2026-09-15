import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { offlineSyncKeys } from '@/lib/offlineCache'
import { syncOfflineData, type OfflineSyncSummary } from '@/features/offlineSync/api/offlineSyncApi'

export function useSyncOfflineData() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: () => syncOfflineData(activeOrg!.id),
    onSuccess: (summary) => {
      // Refresca la vista en memoria del "meta" para cualquier componente
      // que ya esté montado con useOfflineSyncMeta (setQueryData del
      // mutationFn ya lo dejó en la caché, esto solo confirma el re-render).
      void queryClient.invalidateQueries({ queryKey: offlineSyncKeys.meta(activeOrg!.id), exact: true })
      showToast(
        `Sincronizado: ${summary.customers} clientes, ${summary.customerLocations} domicilios, ${summary.locations} sucursales, ${summary.drivers} operadores, ${summary.vehicles} vehículos`,
        'success',
      )
    },
    onError: () => showToast('No se pudo sincronizar — revisa tu conexión', 'error'),
  })
}

/** Lee lo último que dejó `syncOfflineData` en caché (`offlineSyncKeys.meta`)
 * sin volver a pedirlo — `skipToken` en vez de un `queryFn` real porque
 * esta caché nunca se llena sola, solo la llena `syncOfflineData` vía
 * `setQueryData`. Sobrevive un recargo porque esa caché está persistida en
 * `localStorage` (ver `PersistQueryClientProvider` en `main.tsx`). */
export function useOfflineSyncMeta() {
  const { activeOrg } = useOrg()
  return useQuery<OfflineSyncSummary | undefined>({
    queryKey: offlineSyncKeys.meta(activeOrg?.id ?? 'none'),
    queryFn: skipToken,
    enabled: !!activeOrg,
  })
}

/** Sincroniza sola, sin que el usuario tenga que acordarse de tocar el
 * botón: una vez al recuperar señal después de estar sin conexión, y una
 * vez la primera vez que se abre la app con una organización activa y
 * todavía no hay nada sincronizado. Montado una sola vez en `AppShell`. */
export function useAutoSyncOfflineData() {
  const { activeOrg } = useOrg()
  const online = useOnlineStatus()
  const queryClient = useQueryClient()
  const syncMutation = useSyncOfflineData()
  const wasOffline = useRef(false)

  useEffect(() => {
    if (!activeOrg || !online) {
      if (activeOrg) wasOffline.current = !online
      return
    }

    const cameBackOnline = wasOffline.current
    wasOffline.current = false

    const hasSynced = !!queryClient.getQueryData(offlineSyncKeys.meta(activeOrg.id))
    if (cameBackOnline || !hasSynced) {
      syncMutation.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrg?.id, online])
}
