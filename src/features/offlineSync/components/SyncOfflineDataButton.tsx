import { RefreshCw } from 'lucide-react'
import { useOfflineSyncMeta, useSyncOfflineData } from '@/features/offlineSync/hooks/useOfflineSync'
import { formatDateTime } from '@/lib/format'

/** Botón "Sincronizar mis datos" — trae de un jalón clientes, domicilios,
 * sucursales, operadores y vehículos completos (no solo lo que ya se había
 * buscado) para que los formularios de Pedidos puedan armarse sin
 * conexión. También corre sola al recuperar señal y la primera vez que se
 * abre la app (ver `useAutoSyncOfflineData`, montado en `AppShell`) — este
 * botón es para forzarla a mano cuando el usuario sabe que algo cambió
 * (un cliente nuevo, una sucursal nueva) y no quiere esperar. */
export function SyncOfflineDataButton({ compact = false }: { compact?: boolean }) {
  const syncMutation = useSyncOfflineData()
  const metaQuery = useOfflineSyncMeta()

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => syncMutation.mutate()}
        disabled={syncMutation.isPending}
        className="flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        <RefreshCw size={15} strokeWidth={2} className={syncMutation.isPending ? 'animate-spin' : ''} />
        {syncMutation.isPending ? 'Sincronizando…' : 'Sincronizar'}
      </button>
      {!compact && (
        <span className="text-xs text-gray-400">
          {metaQuery.data ? `Última sincronización: ${formatDateTime(metaQuery.data.syncedAt)}` : 'Nunca sincronizado'}
        </span>
      )}
    </div>
  )
}
