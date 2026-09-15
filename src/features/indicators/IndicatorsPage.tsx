import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Clock, Package, Truck, Wrench, FileWarning } from 'lucide-react'
import { PageScroll } from '@/components/ui/PageScroll'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { useOrg } from '@/context/OrgContext'
import { fetchOperationalIndicators } from './api/indicatorsApi'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  tone,
  trendPct,
}: {
  icon: typeof Truck
  label: string
  value: string
  sublabel?: string
  tone: 'accent' | 'green' | 'gray' | 'progress' | 'delayed'
  trendPct?: number | null
}) {
  const toneClasses = {
    accent: 'bg-accent-50 text-accent-600',
    green: 'bg-status-active-bg text-status-active',
    gray: 'bg-gray-100 text-gray-500',
    progress: 'bg-status-progress-bg text-status-progress',
    delayed: 'bg-status-delayed-bg text-status-delayed',
  }[tone]

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-surface px-4 py-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneClasses}`}>
        <Icon size={18} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-lg font-semibold leading-tight text-ink">{value}</p>
          {trendPct != null && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
                trendPct >= 0 ? 'bg-status-active-bg text-status-active' : 'bg-status-delayed-bg text-status-delayed'
              }`}
            >
              {trendPct >= 0 ? '↑' : '↓'}
              {Math.abs(trendPct)}%
            </span>
          )}
        </div>
        <p className="truncate text-xs text-gray-500">{sublabel ?? label}</p>
      </div>
    </div>
  )
}

export function IndicatorsPage() {
  const { activeOrg } = useOrg()
  const [date, setDate] = useState(todayIso())

  const indicatorsQuery = useQuery({
    queryKey: ['operational-indicators', activeOrg?.id, date],
    queryFn: () => fetchOperationalIndicators(activeOrg!.id, date),
    enabled: !!activeOrg,
  })
  const data = indicatorsQuery.data

  return (
    <PageScroll>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink">Indicadores</h1>
            <p className="text-sm text-gray-500">KPIs operativos del día, comparados contra el día anterior cuando aplica.</p>
          </div>
          <label className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-surface px-3 py-1.5 text-sm text-gray-700">
            <Calendar size={14} strokeWidth={2} className="text-gray-400" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto border-0 p-0 text-sm text-gray-900 focus:outline-none focus:ring-0" />
          </label>
        </div>

        {indicatorsQuery.isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        )}

        {indicatorsQuery.isError && <ErrorState message="No se pudieron calcular los indicadores." onRetry={() => void indicatorsQuery.refetch()} />}

        {data && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              icon={Clock}
              label="Entregas a tiempo"
              value={data.onTimePct != null ? `${data.onTimePct}%` : 'Sin datos'}
              sublabel="vs. hora estimada de llegada"
              tone="accent"
              trendPct={data.onTimeTrendPct}
            />
            <StatCard
              icon={Package}
              label="Pedidos entregados"
              value={String(data.jobsDelivered)}
              sublabel="Entregados hoy"
              tone="green"
              trendPct={data.jobsDeliveredTrendPct}
            />
            <StatCard
              icon={Truck}
              label="Flota activa"
              value={`${data.vehiclesActive}/${data.vehiclesTotal}`}
              sublabel="Vehículos activos"
              tone="gray"
            />
            <StatCard
              icon={Wrench}
              label="Mantenimientos vencidos"
              value={String(data.maintenanceOverdueCount)}
              sublabel="Servicios vencidos hoy"
              tone="delayed"
            />
            <StatCard
              icon={FileWarning}
              label="Documentos por vencer"
              value={String(data.documentsExpiringCount)}
              sublabel="Vencidos o próximos (30 días)"
              tone="progress"
            />
          </div>
        )}
      </div>
    </PageScroll>
  )
}
