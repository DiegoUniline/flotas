import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { Can } from '@/components/Can'
import { RoutesTable } from './components/RoutesTable'
import { useRoutePlansQuery } from './hooks/useRoutes'
import { ROUTE_STATUSES, type RoutePlanFilters } from './api/routePlansApi'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function RoutesPage() {
  const navigate = useNavigate()
  const [scheduledDate, setScheduledDate] = useState(todayIso())
  const [status, setStatus] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filters: RoutePlanFilters = { scheduledDate, status, search }
  const routesQuery = useRoutePlansQuery(filters)
  const hasFilters = search.trim() !== '' || status !== null

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Rutas</h1>
          <p className="text-sm text-gray-500">Rutas del día con sus paradas.</p>
        </div>
        <Can permission="routes.create">
          <Button onClick={() => navigate('/rutas/nuevo')}>Nueva ruta</Button>
        </Can>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-surface px-3 py-1.5 text-sm text-gray-700">
          <Calendar size={14} strokeWidth={2} className="text-gray-400" />
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-auto border-0 p-0 text-sm text-gray-900 focus:outline-none focus:ring-0"
          />
        </label>
        <select
          value={status ?? ''}
          onChange={(e) => setStatus(e.target.value || null)}
          className="rounded-full border border-gray-300 bg-surface px-3 py-1.5 text-sm text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        >
          <option value="">Todos los estados</option>
          {ROUTE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <Input placeholder="Buscar por nombre o número..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56 rounded-full" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-surface">
        <TableScrollArea>
          <RoutesTable
            rows={routesQuery.data ?? []}
            loading={routesQuery.isLoading}
            error={routesQuery.isError}
            hasFilters={hasFilters}
            onRetry={() => void routesQuery.refetch()}
            onCreate={() => navigate('/rutas/nuevo')}
          />
        </TableScrollArea>
      </div>
    </div>
  )
}
