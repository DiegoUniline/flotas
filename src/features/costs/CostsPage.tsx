import { useState } from 'react'
import { Fuel, Receipt, Wallet, Clock } from 'lucide-react'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { PageScroll } from '@/components/ui/PageScroll'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { computeDateRange } from '@/lib/dateRanges'
import { formatCurrency } from '@/lib/format'
import { EXPENSE_CATEGORIES } from '@/features/expenses/api/expensesApi'
import { useCostsSummary } from './hooks/useCostsSummary'

const CATEGORY_LABEL = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.value, c.label]))

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  tone,
}: {
  icon: typeof Fuel
  label: string
  value: string
  sublabel?: string
  tone: 'accent' | 'green' | 'gray' | 'delayed'
}) {
  const toneClasses = {
    accent: 'bg-accent-50 text-accent-600',
    green: 'bg-status-active-bg text-status-active',
    gray: 'bg-gray-100 text-gray-500',
    delayed: 'bg-status-delayed-bg text-status-delayed',
  }[tone]

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-surface px-4 py-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneClasses}`}>
        <Icon size={18} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-semibold leading-tight text-ink">{value}</p>
        <p className="truncate text-xs text-gray-500">{sublabel ?? label}</p>
      </div>
    </div>
  )
}

export function CostsPage() {
  const [dateRange, setDateRange] = useState(computeDateRange('this_month'))
  const summaryQuery = useCostsSummary(dateRange)
  const summary = summaryQuery.data

  return (
    <PageScroll>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink">Costos</h1>
            <p className="text-sm text-gray-500">Combustible y gastos aprobados, agregados por vehículo y categoría.</p>
          </div>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        {summaryQuery.isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        )}

        {summaryQuery.isError && <ErrorState message="No se pudo cargar el reporte de costos." onRetry={() => void summaryQuery.refetch()} />}

        {summary && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                icon={Wallet}
                label="Costo total"
                value={formatCurrency(summary.totalCost)}
                sublabel="Combustible + gastos aprobados"
                tone="accent"
              />
              <StatCard
                icon={Fuel}
                label="Combustible"
                value={formatCurrency(summary.totalFuelCost)}
                sublabel={`${summary.totalFuelLiters.toLocaleString('es-MX')} L cargados`}
                tone="green"
              />
              <StatCard
                icon={Receipt}
                label="Gastos aprobados"
                value={formatCurrency(summary.totalApprovedExpenses)}
                tone="gray"
              />
              <StatCard
                icon={Clock}
                label="Gastos pendientes"
                value={formatCurrency(summary.totalPendingExpenses)}
                sublabel={`${summary.pendingExpensesCount} por aprobar`}
                tone="delayed"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-surface">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h2 className="text-sm font-semibold text-ink">Costos por vehículo</h2>
                </div>
                {summary.byVehicle.length === 0 ? (
                  <EmptyState title="Sin datos" description="No hay combustible ni gastos aprobados en este periodo." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          <th className="px-4 py-2">Vehículo</th>
                          <th className="px-4 py-2">Combustible</th>
                          <th className="px-4 py-2">Gastos</th>
                          <th className="px-4 py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.byVehicle.map((row) => (
                          <tr key={row.vehicleId} className="border-b border-gray-100">
                            <td className="px-4 py-2 font-medium text-gray-900">{row.label}</td>
                            <td className="px-4 py-2 text-gray-700">{formatCurrency(row.fuelCost)}</td>
                            <td className="px-4 py-2 text-gray-700">{formatCurrency(row.expensesCost)}</td>
                            <td className="px-4 py-2 font-medium text-gray-900">{formatCurrency(row.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 bg-surface">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h2 className="text-sm font-semibold text-ink">Gastos por categoría</h2>
                </div>
                {summary.byCategory.length === 0 ? (
                  <EmptyState title="Sin datos" description="No hay gastos aprobados en este periodo." />
                ) : (
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-2">Categoría</th>
                        <th className="px-4 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.byCategory.map((row) => (
                        <tr key={row.category} className="border-b border-gray-100">
                          <td className="px-4 py-2 font-medium text-gray-900">{CATEGORY_LABEL[row.category] ?? row.category}</td>
                          <td className="px-4 py-2 text-gray-700">{formatCurrency(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </PageScroll>
  )
}
