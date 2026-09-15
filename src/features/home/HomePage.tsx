import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Map, ClipboardList, Truck, Wrench, Package, FileWarning, ArrowRight } from 'lucide-react'
import { PageScroll } from '@/components/ui/PageScroll'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { useOrg } from '@/context/OrgContext'
import { fetchHomeSummary } from './api/homeApi'

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
  to,
}: {
  icon: typeof Truck
  label: string
  value: string
  tone: 'accent' | 'green' | 'gray' | 'delayed' | 'progress'
  to: string
}) {
  const toneClasses = {
    accent: 'bg-accent-50 text-accent-600',
    green: 'bg-status-active-bg text-status-active',
    gray: 'bg-gray-100 text-gray-500',
    delayed: 'bg-status-delayed-bg text-status-delayed',
    progress: 'bg-status-progress-bg text-status-progress',
  }[tone]

  return (
    <Link
      to={to}
      className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-200 bg-surface px-4 py-3.5 transition-colors hover:border-accent-300 hover:bg-gray-50"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClasses}`}>
        <Icon size={19} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-semibold leading-tight text-ink">{value}</p>
        <p className="truncate text-xs text-gray-500">{label}</p>
      </div>
    </Link>
  )
}

function QuickLink({ icon: Icon, label, description, to }: { icon: typeof Truck; label: string; description: string; to: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-200 bg-surface px-4 py-3.5 transition-colors hover:border-accent-300 hover:bg-gray-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600">
        <Icon size={17} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="truncate text-xs text-gray-500">{description}</p>
      </div>
      <ArrowRight size={16} strokeWidth={2} className="shrink-0 text-gray-300" />
    </Link>
  )
}

export function HomePage() {
  const { activeOrg } = useOrg()

  const summaryQuery = useQuery({
    queryKey: ['home-summary', activeOrg?.id],
    queryFn: () => fetchHomeSummary(activeOrg!.id),
    enabled: !!activeOrg,
  })
  const data = summaryQuery.data

  return (
    <PageScroll>
      <div className="flex flex-col gap-4 p-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Inicio</h1>
          <p className="text-sm text-gray-500">Resumen de {activeOrg?.name ?? 'tu empresa'} hoy.</p>
        </div>

        {summaryQuery.isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        )}

        {summaryQuery.isError && <ErrorState message="No se pudo cargar el resumen." onRetry={() => void summaryQuery.refetch()} />}

        {data && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile icon={Truck} label="Vehículos activos" value={`${data.vehiclesActive}/${data.vehiclesTotal}`} tone="accent" to="/vehiculos" />
            <StatTile icon={ClipboardList} label="Pedidos de hoy" value={String(data.jobsToday)} tone="green" to="/pedidos" />
            <StatTile icon={Wrench} label="Mantenimientos vencidos" value={String(data.maintenanceOverdueCount)} tone="delayed" to="/mantenimientos" />
            <StatTile icon={Package} label="Refacciones con stock bajo" value={String(data.lowStockPartsCount)} tone="progress" to="/refacciones" />
            <StatTile icon={FileWarning} label="Documentos por vencer" value={String(data.documentsExpiringCount)} tone="gray" to="/documentos" />
          </div>
        )}

        <div>
          <h2 className="mb-2 text-sm font-semibold text-ink">Accesos rápidos</h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <QuickLink icon={Map} label="Centro de control" description="Mapa en vivo de la operación" to="/centro-de-control" />
            <QuickLink icon={ClipboardList} label="Pedidos" description="Ver y crear pedidos" to="/pedidos" />
            <QuickLink icon={Truck} label="Vehículos" description="Catálogo de flota" to="/vehiculos" />
          </div>
        </div>
      </div>
    </PageScroll>
  )
}
