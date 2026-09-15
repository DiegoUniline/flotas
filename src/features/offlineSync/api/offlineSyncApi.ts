import { queryClient } from '@/lib/queryClient'
import { offlineSyncKeys } from '@/lib/offlineCache'
import { fetchCustomerOptions } from '@/features/customers/api/customersApi'
import { fetchAllCustomerLocationsForOrg } from '@/features/customers/api/customerLocationsApi'
import { fetchLocationOptions } from '@/features/locations/api/locationsApi'
import { fetchDriverOptions } from '@/features/drivers/api/driversApi'
import { fetchVehicleOptions } from '@/features/vehicles/api/vehiclesApi'

export interface OfflineSyncSummary {
  customers: number
  customerLocations: number
  locations: number
  drivers: number
  vehicles: number
  syncedAt: string
}

/** "Sincronizar mis datos": trae de un jalón la lista completa (no solo lo
 * que ya se había buscado) de clientes, domicilios, sucursales, operadores
 * y vehículos de la organización activa, y la deja guardada en la caché de
 * TanStack Query bajo `offlineSyncKeys` — las mismas llaves que leen
 * `searchCustomers`/`searchCustomerLocations`/`searchLocations`/
 * `searchDrivers`/`searchVehicles` como respaldo cuando no hay conexión
 * (ver `lib/offlineCache.ts`). Como esa caché ya está persistida en
 * `localStorage` (`PersistQueryClientProvider`, ver `main.tsx`), lo
 * sincronizado sobrevive a cerrar la pestaña — no hace falta "sincronizar"
 * de nuevo cada vez que se abre la app, solo cuando cambien los catálogos.
 * No trae pedidos (esos ya se refrescan solos vía `useMyJobs`) ni datos que
 * no se usan en los formularios de creación de pedidos — sincronizar "todo
 * lo de la base" a cada dispositivo sería un problema de escala y de
 * privacidad que no se pidió. */
export async function syncOfflineData(organizationId: string): Promise<OfflineSyncSummary> {
  const [customers, customerLocations, locations, drivers, vehicles] = await Promise.all([
    fetchCustomerOptions(organizationId),
    fetchAllCustomerLocationsForOrg(organizationId),
    fetchLocationOptions(organizationId),
    fetchDriverOptions(organizationId),
    fetchVehicleOptions(organizationId),
  ])

  queryClient.setQueryData(offlineSyncKeys.customers(organizationId), customers)
  queryClient.setQueryData(offlineSyncKeys.customerLocations(organizationId), customerLocations)
  queryClient.setQueryData(offlineSyncKeys.locations(organizationId), locations)
  queryClient.setQueryData(offlineSyncKeys.drivers(organizationId), drivers)
  queryClient.setQueryData(offlineSyncKeys.vehicles(organizationId), vehicles)

  const summary: OfflineSyncSummary = {
    customers: customers.length,
    customerLocations: customerLocations.length,
    locations: locations.length,
    drivers: drivers.length,
    vehicles: vehicles.length,
    syncedAt: new Date().toISOString(),
  }
  queryClient.setQueryData(offlineSyncKeys.meta(organizationId), summary)
  return summary
}
