import { queryClient } from '@/lib/queryClient'

/** Llaves estables de la caché de "sincronizar mis datos"
 * (`features/offlineSync`) — las mismas que usa `syncOfflineData` para
 * guardar la última lista completa conocida y que los `search*` de cada
 * módulo (clientes, domicilios, sucursales, operadores, vehículos) leen
 * como respaldo sin conexión. Viven aquí (no dentro de `offlineSync`)
 * porque los `search*` de cada `features/<módulo>/api` las necesitan sin
 * crear una dependencia circular con `offlineSync`. */
export const offlineSyncKeys = {
  customers: (organizationId: string) => ['offline-sync', 'customers', organizationId] as const,
  customerLocations: (organizationId: string) => ['offline-sync', 'customer-locations', organizationId] as const,
  locations: (organizationId: string) => ['offline-sync', 'locations', organizationId] as const,
  drivers: (organizationId: string) => ['offline-sync', 'drivers', organizationId] as const,
  vehicles: (organizationId: string) => ['offline-sync', 'vehicles', organizationId] as const,
  meta: (organizationId: string) => ['offline-sync', 'meta', organizationId] as const,
}

/** Intenta la búsqueda real en la red; si no hay conexión, o la petición
 * falla (señal intermitente), cae a filtrar en el dispositivo la última
 * lista completa que se sincronizó con "Sincronizar mis datos" — así los
 * combos de cliente/domicilio/sucursal/operador/vehículo de los
 * formularios de Pedidos siguen funcionando sin conexión con cualquier
 * registro ya sincronizado, no solo con lo que se hubiera buscado antes
 * por casualidad (que era el límite real documentado en la fase
 * anterior). Sin datos sincronizados todavía, simplemente no hay nada que
 * ofrecer sin conexión — no se inventa nada. */
export async function searchWithOfflineFallback<T>(
  cacheKey: readonly unknown[],
  matches: (item: T, term: string) => boolean,
  fetchOnline: () => Promise<T[]>,
  query: string,
): Promise<T[]> {
  if (navigator.onLine) {
    try {
      return await fetchOnline()
    } catch {
      // sin señal real a pesar de navigator.onLine (falso positivo común en
      // wifi cautivo/señal intermitente) — cae al respaldo de abajo.
    }
  }

  const cached = (queryClient.getQueryData(cacheKey as unknown[]) as T[] | undefined) ?? []
  const term = query.trim().toLowerCase()
  const filtered = term ? cached.filter((item) => matches(item, term)) : cached
  return filtered.slice(0, 20)
}
