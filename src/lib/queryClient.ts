import { QueryClient } from '@tanstack/react-query'
import { createJob, type JobInsert } from '@/features/jobs/api/jobsApi'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
    mutations: {
      // Default de TanStack Query, explícito a propósito: sin conexión, una
      // mutación queda "pausada" en vez de fallar, y se reintenta sola en
      // cuanto el navegador vuelve a estar en línea (evento `online`) — no
      // hace falta código propio para ese caso mientras la pestaña siga
      // abierta. `crearPedido` (abajo) además sobrevive a que se cierre o
      // recargue la pestaña estando sin conexión.
      networkMode: 'online',
    },
  },
})

/** Registrar la función real de "crear pedido" contra su `mutationKey`
 * (en vez de solo pasarla inline a `useMutation` en el componente) es lo
 * que permite que la mutación sobreviva un recargo de la pestaña mientras
 * sigue pausada sin conexión: `PersistQueryClientProvider` (ver main.tsx)
 * persiste la cola de mutaciones pendientes a `localStorage`, pero solo
 * guarda la `mutationKey` y las variables — no puede serializar una
 * función — así que al recargar, React Query necesita encontrar la
 * función aquí para poder reintentarla. Las variables van explícitas
 * (`organizationId` + `input`, sin depender de contexto de React) porque
 * el reintento puede ocurrir sin que ningún componente esté montado
 * todavía. El folio (`job_number`) y el `id` del pedido ya viajan dentro
 * de `input`, generados en el dispositivo antes de la primera llamada
 * (ver `generateJobNumber`/`generateJobId` en `jobsApi.ts`) — por eso da
 * igual cuántas veces se reintente o cuándo por fin haya señal: siempre
 * es el mismo pedido con el mismo folio. */
queryClient.setMutationDefaults(['create-job'], {
  mutationFn: ({ organizationId, input }: { organizationId: string; input: JobInsert }) => createJob(organizationId, input),
  // Va en los defaults (no solo en el `onSuccess` que pasa `JobDetailPage`
  // a `useMutation`) porque este `onSuccess` debe correr también cuando la
  // mutación se reintenta en segundo plano al recuperar señal, sin ningún
  // componente montado escuchando — un `onSuccess` local del componente no
  // se dispara si ya no hay nadie observando esa mutación.
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: ['jobs'] })
    void queryClient.invalidateQueries({ queryKey: ['my-jobs'] })
  },
})
