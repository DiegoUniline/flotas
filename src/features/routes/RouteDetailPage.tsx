import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Can } from '@/components/Can'
import {
  useAddStopFromJob,
  useDeleteRouteStop,
  useMarkStopStatus,
  usePendingJobOptions,
  useRoutePlan,
  useRouteStops,
  useUpdateRoutePlan,
} from '@/features/routes/hooks/useRoutes'
import { ROUTE_STATUSES } from '@/features/routes/api/routePlansApi'
import { STOP_STATUSES } from '@/features/routes/api/routeStopsApi'

const ROUTE_STATUS_LABELS = Object.fromEntries(ROUTE_STATUSES.map((s) => [s.value, s.label]))
const STOP_STATUS_LABELS = Object.fromEntries(STOP_STATUSES.map((s) => [s.value, s.label]))
const STOP_STATUS_TONE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-500',
  in_progress: 'bg-status-progress-bg text-status-progress',
  completed: 'bg-status-active-bg text-status-active',
  skipped: 'bg-status-delayed-bg text-status-delayed',
}

const NEXT_ROUTE_STATUS: Record<string, { next: string; label: string } | undefined> = {
  draft: { next: 'planned', label: 'Marcar planeada' },
  planned: { next: 'in_progress', label: 'Iniciar ruta' },
  in_progress: { next: 'completed', label: 'Completar ruta' },
}

export function RouteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const routeQuery = useRoutePlan(id)
  const stopsQuery = useRouteStops(id)
  const updateRouteMutation = useUpdateRoutePlan(id)
  const markStopMutation = useMarkStopStatus(id ?? '')
  const deleteStopMutation = useDeleteRouteStop(id ?? '')
  const addStopMutation = useAddStopFromJob(id ?? '')
  const [pickerOpen, setPickerOpen] = useState(false)
  const pendingJobsQuery = usePendingJobOptions(routeQuery.data?.scheduled_date ?? undefined)

  const nextStatus = routeQuery.data ? NEXT_ROUTE_STATUS[routeQuery.data.status] : undefined

  return (
    <div className="flex flex-col gap-4 p-6">
      <Link to="/rutas" className="flex w-fit items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
        <ArrowLeft size={15} strokeWidth={2} />
        Rutas
      </Link>

      {routeQuery.isLoading && <Skeleton className="h-24" />}
      {routeQuery.isError && <ErrorState message="No se pudo cargar la ruta." onRetry={() => void routeQuery.refetch()} />}

      {routeQuery.data && (
        <>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-ink">
                  {routeQuery.data.name ?? routeQuery.data.route_number ?? 'Ruta'}
                </h1>
                <p className="text-sm text-gray-500">
                  {routeQuery.data.scheduled_date} ·{' '}
                  {routeQuery.data.drivers ? `${routeQuery.data.drivers.first_name} ${routeQuery.data.drivers.last_name}` : 'Sin operador'} ·{' '}
                  {routeQuery.data.vehicles?.economic_number ?? routeQuery.data.vehicles?.plate ?? 'Sin vehículo'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  {ROUTE_STATUS_LABELS[routeQuery.data.status] ?? routeQuery.data.status}
                </span>
                <Can permission="routes.assign">
                  {nextStatus && (
                    <Button
                      variant="secondary"
                      loading={updateRouteMutation.isPending}
                      onClick={() => updateRouteMutation.mutate({ id: routeQuery.data!.id, input: { status: nextStatus.next } })}
                    >
                      {nextStatus.label}
                    </Button>
                  )}
                </Can>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Paradas</h2>
              <Can permission="routes.assign">
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
                >
                  <Plus size={15} strokeWidth={2} />
                  Agregar parada
                </button>
              </Can>
            </div>

            {stopsQuery.isLoading ? (
              <Skeleton className="h-20" />
            ) : stopsQuery.data && stopsQuery.data.length > 0 ? (
              <ol className="flex flex-col gap-2">
                {stopsQuery.data.map((stop, index) => (
                  <li key={stop.id} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">
                          {stop.name ?? stop.jobs?.customers?.name ?? 'Parada'}
                          {stop.jobs?.job_number && <span className="ml-1.5 text-gray-400">· {stop.jobs.job_number}</span>}
                        </p>
                        <p className="text-xs text-gray-500">{stop.address ?? 'Sin dirección'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STOP_STATUS_TONE[stop.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STOP_STATUS_LABELS[stop.status] ?? stop.status}
                      </span>
                      <Can permission="routes.assign">
                        {stop.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => markStopMutation.mutate({ id: stop.id, status: 'in_progress' })}
                            className="text-xs font-medium text-gray-600 hover:text-gray-900"
                          >
                            En camino
                          </button>
                        )}
                        {stop.status === 'in_progress' && (
                          <button
                            type="button"
                            onClick={() => markStopMutation.mutate({ id: stop.id, status: 'completed' })}
                            className="text-xs font-medium text-gray-600 hover:text-gray-900"
                          >
                            Completar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteStopMutation.mutate(stop.id)}
                          className="text-gray-400 hover:text-red-600"
                          aria-label="Eliminar parada"
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      </Can>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState title="Sin paradas" description="Agrega paradas desde los pedidos pendientes de esta fecha." />
            )}
          </div>
        </>
      )}

      <Drawer open={pickerOpen} title="Agregar parada desde un pedido" onClose={() => setPickerOpen(false)}>
        {pendingJobsQuery.data && pendingJobsQuery.data.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {pendingJobsQuery.data.map((job) => (
              <li key={job.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{job.job_number ?? job.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-500">{job.customers?.name ?? 'Sin cliente'}</p>
                </div>
                <Button
                  variant="secondary"
                  loading={addStopMutation.isPending}
                  onClick={() => addStopMutation.mutate(job.id, { onSuccess: () => setPickerOpen(false) })}
                >
                  Agregar
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Sin pedidos pendientes" description="No hay pedidos pendientes para la fecha de esta ruta." />
        )}
      </Drawer>
    </div>
  )
}
