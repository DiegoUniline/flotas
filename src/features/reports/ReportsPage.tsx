import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { PageScroll } from '@/components/ui/PageScroll'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { useOrg } from '@/context/OrgContext'
import { computeDateRange } from '@/lib/dateRanges'
import { formatCurrency } from '@/lib/format'
import { JOB_STATUSES } from '@/features/jobs/api/jobsApi'
import { fetchDriverActivity, fetchJobStatusCounts, fetchOnTimeStats, fetchTopCustomers } from './api/reportsApi'

const JOB_STATUS_LABEL = Object.fromEntries(JOB_STATUSES.map((s) => [s.value, s.label]))

export function ReportsPage() {
  const { activeOrg } = useOrg()
  const [dateRange, setDateRange] = useState(computeDateRange('this_month'))

  const statusQuery = useQuery({
    queryKey: ['reports-job-status', activeOrg?.id, dateRange],
    queryFn: () => fetchJobStatusCounts(activeOrg!.id, dateRange),
    enabled: !!activeOrg,
  })
  const onTimeQuery = useQuery({
    queryKey: ['reports-on-time', activeOrg?.id, dateRange],
    queryFn: () => fetchOnTimeStats(activeOrg!.id, dateRange),
    enabled: !!activeOrg,
  })
  const customersQuery = useQuery({
    queryKey: ['reports-top-customers', activeOrg?.id, dateRange],
    queryFn: () => fetchTopCustomers(activeOrg!.id, dateRange),
    enabled: !!activeOrg,
  })
  const driversQuery = useQuery({
    queryKey: ['reports-driver-activity', activeOrg?.id, dateRange],
    queryFn: () => fetchDriverActivity(activeOrg!.id, dateRange),
    enabled: !!activeOrg,
  })

  const loading = statusQuery.isLoading || onTimeQuery.isLoading || customersQuery.isLoading || driversQuery.isLoading
  const anyError = statusQuery.isError || onTimeQuery.isError || customersQuery.isError || driversQuery.isError

  return (
    <PageScroll>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-ink">Reportes</h1>
            <p className="text-sm text-gray-500">Desglose de pedidos por estado, entregas a tiempo, clientes y operadores del periodo.</p>
          </div>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        )}

        {anyError && <ErrorState message="No se pudieron cargar los reportes." onRetry={() => void Promise.all([statusQuery.refetch(), onTimeQuery.refetch(), customersQuery.refetch(), driversQuery.refetch()])} />}

        {!loading && !anyError && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-surface">
              <div className="border-b border-gray-200 px-4 py-3">
                <h2 className="text-sm font-semibold text-ink">Pedidos por estado</h2>
              </div>
              {(statusQuery.data ?? []).length === 0 ? (
                <EmptyState title="Sin pedidos" description="No hay pedidos programados en este periodo." />
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-2">Estado</th>
                      <th className="px-4 py-2">Pedidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(statusQuery.data ?? []).map((row) => (
                      <tr key={row.status} className="border-b border-gray-100">
                        <td className="px-4 py-2 font-medium text-gray-900">{JOB_STATUS_LABEL[row.status] ?? row.status}</td>
                        <td className="px-4 py-2 text-gray-700">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-surface">
              <div className="border-b border-gray-200 px-4 py-3">
                <h2 className="text-sm font-semibold text-ink">Entregas a tiempo</h2>
                <p className="text-xs text-gray-500">Compara la hora real de cierre de cada parada contra su hora estimada de llegada.</p>
              </div>
              {!onTimeQuery.data || onTimeQuery.data.evaluated === 0 ? (
                <EmptyState title="Sin datos" description="No hay paradas con hora estimada y hora de cierre en este periodo para comparar." />
              ) : (
                <div className="grid grid-cols-3 gap-3 p-4 text-center">
                  <div>
                    <p className="text-2xl font-semibold text-ink">{onTimeQuery.data.onTimePct}%</p>
                    <p className="text-xs text-gray-500">A tiempo</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-status-active">{onTimeQuery.data.onTime}</p>
                    <p className="text-xs text-gray-500">Entregas a tiempo</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-status-delayed">{onTimeQuery.data.late}</p>
                    <p className="text-xs text-gray-500">Entregas tarde</p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-surface">
              <div className="border-b border-gray-200 px-4 py-3">
                <h2 className="text-sm font-semibold text-ink">Top clientes</h2>
              </div>
              {(customersQuery.data ?? []).length === 0 ? (
                <EmptyState title="Sin datos" description="No hay pedidos con cliente asignado en este periodo." />
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-2">Cliente</th>
                      <th className="px-4 py-2">Pedidos</th>
                      <th className="px-4 py-2">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(customersQuery.data ?? []).map((row) => (
                      <tr key={row.customerId} className="border-b border-gray-100">
                        <td className="px-4 py-2 font-medium text-gray-900">
                          <Link to={`/clientes/${row.customerId}`} className="text-accent-600 hover:underline">
                            {row.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-gray-700">{row.jobCount}</td>
                        <td className="px-4 py-2 text-gray-700">{formatCurrency(row.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-surface">
              <div className="border-b border-gray-200 px-4 py-3">
                <h2 className="text-sm font-semibold text-ink">Actividad por operador</h2>
              </div>
              {(driversQuery.data ?? []).length === 0 ? (
                <EmptyState title="Sin datos" description="No hay pedidos con operador asignado en este periodo." />
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-2">Operador</th>
                      <th className="px-4 py-2">Entregados</th>
                      <th className="px-4 py-2">Total asignados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(driversQuery.data ?? []).map((row) => (
                      <tr key={row.driverId} className="border-b border-gray-100">
                        <td className="px-4 py-2 font-medium text-gray-900">
                          <Link to={`/operadores/${row.driverId}`} className="text-accent-600 hover:underline">
                            {row.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-gray-700">{row.deliveredCount}</td>
                        <td className="px-4 py-2 text-gray-700">{row.totalJobs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </PageScroll>
  )
}
