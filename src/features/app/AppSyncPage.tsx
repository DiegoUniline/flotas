import { PageScroll } from '@/components/ui/PageScroll'
import { SyncOfflineDataButton } from '@/features/offlineSync/components/SyncOfflineDataButton'

/** Pestaña "Sincronizar" de la app del repartidor — antes era un botón
 * suelto en `MyJobsPage`/el header, ahora vive aquí como su propia pantalla
 * dentro de `AppTabLayout`. `SyncOfflineDataButton` en sí no cambió (sigue
 * corriendo sola al recuperar señal, ver `useAutoSyncOfflineData` en
 * `AppShell`) — esto es solo un lugar propio para forzarla a mano. */
export function AppSyncPage() {
  return (
    <PageScroll>
      <div className="mx-auto flex max-w-md flex-col gap-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-ink">Sincronizar</h1>
          <p className="text-sm text-gray-500">
            Trae clientes, domicilios, sucursales, operadores y vehículos completos para poder crear pedidos sin conexión.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-surface p-4">
          <SyncOfflineDataButton />
        </div>
        <p className="text-xs text-gray-400">
          Se sincroniza sola al recuperar señal después de estar sin conexión, y la primera vez que abres la app — usa este botón
          solo si sabes que algo cambió (un cliente o sucursal nueva) y no quieres esperar al siguiente reconecte.
        </p>
      </div>
    </PageScroll>
  )
}
