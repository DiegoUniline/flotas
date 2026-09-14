import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { useCreateRoutePlan, useRoutePlansQuery } from './hooks/useRoutes'
import { RoutePlanForm, toRoutePlanInsert, type RoutePlanFormValues } from './components/RoutePlanForm'
import { ROUTE_STATUSES, type RoutePlanFilters } from './api/routePlansApi'

const STATUS_LABELS = Object.fromEntries(ROUTE_STATUSES.map((s) => [s.value, s.label]))
const STATUS_TONE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  planned: 'bg-status-progress-bg text-status-progress',
  in_progress: 'bg-status-stopped-bg text-status-stopped',
  completed: 'bg-status-active-bg text-status-active',
  cancelled: 'bg-status-delayed-bg text-status-delayed',
}

const SELECT_CLASSNAME =
  'rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function RoutesPage() {
  const [filters, setFilters] = useState<RoutePlanFilters>({ scheduledDate: todayIso(), status: null })
  const [drawerOpen, setDrawerOpen] = useState(false)

  const routesQuery = useRoutePlansQuery(filters)
  const createMutation = useCreateRoutePlan()

  function handleSubmit(values: RoutePlanFormValues) {
    createMutation.mutate(toRoutePlanInsert(values), { onSuccess: () => setDrawerOpen(false) })
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Rutas</h1>
          <p className="text-sm text-gray-500">Rutas del día con sus paradas.</p>
        </div>
        <Can permission="routes.create">
          <Button onClick={() => setDrawerOpen(true)}>Nueva ruta</Button>
        </Can>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          value={filters.scheduledDate ?? ''}
          onChange={(e) => setFilters((current) => ({ ...current, scheduledDate: e.target.value || null }))}
          className="w-auto"
        />
        <select
          value={filters.status ?? ''}
          onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value || null }))}
          className={SELECT_CLASSNAME}
        >
          <option value="">Todos los estados</option>
          {ROUTE_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        {routesQuery.isError ? (
          <ErrorState message="No se pudieron cargar las rutas." onRetry={() => void routesQuery.refetch()} />
        ) : routesQuery.isLoading ? (
          <TableSkeleton columns={5} />
        ) : routesQuery.data && routesQuery.data.length > 0 ? (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2">Ruta</th>
                <th className="px-4 py-2">Operador</th>
                <th className="px-4 py-2">Vehículo</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {routesQuery.data.map((route) => (
                <tr key={route.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">
                    <Link to={`/rutas/${route.id}`} className="hover:text-accent-600">
                      {route.name ?? route.route_number ?? route.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {route.drivers ? `${route.drivers.first_name} ${route.drivers.last_name}` : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {route.vehicles?.economic_number ?? route.vehicles?.plate ?? '—'}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[route.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[route.status] ?? route.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="Sin rutas para esta fecha"
            description="Crea una ruta y agrégale paradas desde los pedidos pendientes."
            action={
              <Can permission="routes.create">
                <Button onClick={() => setDrawerOpen(true)}>Nueva ruta</Button>
              </Can>
            }
          />
        )}
      </div>

      <Drawer open={drawerOpen} title="Nueva ruta" onClose={() => setDrawerOpen(false)}>
        <RoutePlanForm loading={createMutation.isPending} onSubmit={handleSubmit} onCancel={() => setDrawerOpen(false)} />
      </Drawer>
    </div>
  )
}
