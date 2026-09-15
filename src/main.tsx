import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import './index.css'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { queryClient } from './lib/queryClient'

// Cachea las respuestas de TanStack Query en localStorage: al recargar la
// app sin conexión, las pantallas que ya se habían visitado (pedidos,
// vehículos, el Centro de control…) siguen mostrando los últimos datos
// reales conocidos en vez de una pantalla en blanco/error de red. No
// reemplaza al service worker (ver vite.config.ts, que cachea el shell de
// la app y las respuestas de Supabase a nivel de red) — este persister
// además sobrevive a que el usuario cierre la pestaña por completo.
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'flotaa-query-cache',
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
          dehydrateOptions: {
            // Persiste también las mutaciones pendientes (p. ej. "crear
            // pedido" hecho sin conexión) para poder reintentarlas después
            // de un recargo — ver lib/queryClient.ts, setMutationDefaults.
            shouldDehydrateMutation: () => true,
          },
        }}
        onSuccess={() => {
          // Al terminar de restaurar la caché (incluidas mutaciones que
          // quedaron pausadas sin conexión antes del recargo), reintenta
          // las que sigan pendientes si ya hay señal.
          void queryClient.resumePausedMutations()
        }}
      >
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
