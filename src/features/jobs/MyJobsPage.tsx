import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, MapPinned, Navigation, Package, Phone } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageScroll } from '@/components/ui/PageScroll'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLocationSharing } from '@/context/LocationSharingContext'
import { JobDetailContent } from '@/features/jobs/JobDetailContent'
import { useMyJobs, useUpdateJobSilent } from '@/features/jobs/hooks/useJobs'
import { ACTIVE_JOB_STATUSES, JOB_STATUSES, addressLabel, directionsUrl, type MyJob } from '@/features/jobs/api/jobsApi'
import { useToast } from '@/context/ToastContext'
import { formatCurrency, formatDate } from '@/lib/format'

const STATUS_LABEL = Object.fromEntries(JOB_STATUSES.map((s) => [s.value, s.label])) as Record<string, string>

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-500',
  en_route: 'bg-status-progress-bg text-status-progress',
  arrived: 'bg-status-progress-bg text-status-progress',
  delivered: 'bg-status-active-bg text-status-active',
  partial: 'bg-status-stopped-bg text-status-stopped',
  not_delivered: 'bg-status-delayed-bg text-status-delayed',
  rejected: 'bg-status-delayed-bg text-status-delayed',
  rescheduled: 'bg-status-stopped-bg text-status-stopped',
}

const FINAL_STATUSES = ['delivered', 'partial', 'not_delivered', 'rejected']

/** Siguiente(s) acción(es) sugerida(s) según el estado actual — un flujo
 * courier típico, no los 8 estados de `JOB_STATUSES` a la vez (eso ya vive
 * en la ficha completa para edición administrativa). */
const NEXT_ACTIONS: Record<string, { status: string; label: string; danger?: boolean }[]> = {
  pending: [
    { status: 'en_route', label: 'Iniciar viaje' },
    { status: 'rejected', label: 'Rechazado', danger: true },
  ],
  en_route: [
    { status: 'arrived', label: 'Llegué' },
    { status: 'not_delivered', label: 'No entregado', danger: true },
  ],
  arrived: [
    { status: 'delivered', label: 'Entregado' },
    { status: 'partial', label: 'Entrega parcial' },
    { status: 'not_delivered', label: 'No entregado', danger: true },
    { status: 'rejected', label: 'Rechazado', danger: true },
  ],
}

/** Intenta una lectura puntual de GPS del dispositivo (mismo mecanismo que
 * `GpsCaptureField`/"Usar mi ubicación") para sellar automáticamente dónde
 * ocurrió el evento de entrega — mejor esfuerzo, nunca bloquea el cambio de
 * estado si el operador no dio permiso o el GPS tarda más de 8s. */
function captureCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 },
    )
  })
}

function JobCard({ job, onOpen }: { job: MyJob; onOpen: () => void }) {
  const { showToast } = useToast()
  const updateMutation = useUpdateJobSilent()
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)

  async function handleStatusChange(nextStatus: string) {
    setPendingStatus(nextStatus)
    try {
      const input: Record<string, unknown> = { status: nextStatus }

      if (nextStatus === 'delivered' && !job.received_at) {
        input.received_at = new Date().toISOString()
      }

      if (FINAL_STATUSES.includes(nextStatus) && job.delivery_latitude == null) {
        const position = await captureCurrentPosition()
        if (position) {
          input.delivery_latitude = position.lat
          input.delivery_longitude = position.lng
          input.delivery_captured_at = new Date().toISOString()
        }
      }

      await updateMutation.mutateAsync({ id: job.id, input })
      showToast(`Pedido ${job.job_number ?? ''} → ${STATUS_LABEL[nextStatus] ?? nextStatus}`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo actualizar el pedido', 'error')
    } finally {
      setPendingStatus(null)
    }
  }

  const actions = NEXT_ACTIONS[job.status] ?? []
  const maps = directionsUrl(job)

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface shadow-sm">
      <button type="button" onClick={onOpen} className="flex w-full items-start justify-between gap-2 p-4 pb-3 text-left">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-gray-400">{job.job_number ?? 'Sin número'}</p>
          <p className="truncate text-base font-semibold text-ink">{job.customers?.name ?? 'Sin cliente'}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[job.status] ?? 'bg-gray-100 text-gray-500'}`}>
          {STATUS_LABEL[job.status] ?? job.status}
        </span>
      </button>

      <div className="mx-4 flex flex-col gap-2 rounded-lg bg-gray-50 p-3">
        <button type="button" onClick={onOpen} className="flex items-start gap-2 text-left text-sm text-gray-700">
          <MapPin size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-gray-400" />
          <span className="min-w-0">{addressLabel(job)}</span>
        </button>
        {maps && (
          <a
            href={maps}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-1.5 rounded-full bg-accent-500 py-1.5 text-xs font-semibold text-white hover:bg-accent-600"
          >
            <Navigation size={13} strokeWidth={2.5} />
            Cómo llegar
          </a>
        )}
      </div>

      {(job.receiver_name || job.receiver_phone) && (
        <div className="mx-4 mt-2 flex items-center justify-between gap-2 text-sm text-gray-600">
          {job.receiver_name && (
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              <Package size={14} strokeWidth={2} className="shrink-0 text-gray-400" />
              {job.receiver_name}
            </span>
          )}
          {job.receiver_phone && (
            <a
              href={`tel:${job.receiver_phone}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              <Phone size={13} strokeWidth={2} />
              {job.receiver_phone}
            </a>
          )}
        </div>
      )}

      <div className="mx-4 mb-4 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        {job.scheduled_date && <span>{formatDate(job.scheduled_date)}</span>}
        {job.time_window_start && <span>{job.time_window_start.slice(0, 5)}–{job.time_window_end?.slice(0, 5) ?? ''}</span>}
        {job.amount != null && <span className="font-medium text-ink">{formatCurrency(job.amount)}</span>}
        {job.cod_amount != null && <span>COD {formatCurrency(job.cod_amount)}</span>}
      </div>

      {actions.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 p-4 pt-3">
          {actions.map((action) => (
            <Button
              key={action.status}
              variant={action.danger ? 'danger' : 'primary'}
              loading={pendingStatus === action.status}
              disabled={updateMutation.isPending && pendingStatus !== action.status}
              onClick={() => void handleStatusChange(action.status)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

/** App del repartidor: sus pedidos asignados, con acciones rápidas de
 * cambio de estado (un tap, sin abrir la ficha completa) — separada de
 * `/pedidos` (la lista administrativa densa tipo Odoo, con todos los
 * pedidos de la organización) porque un operador en el celular necesita
 * tarjetas grandes y botones táctiles, no una tabla 90/10. Tocar el cuerpo
 * de la tarjeta abre la ficha completa (`JobDetailContent`, mismo
 * componente que usan Pedidos y el Centro de control) en un `Modal` para
 * ver/editar todo lo demás sin salir de esta pantalla. */
export function MyJobsPage() {
  const { driverProfile, driverProfileLoading } = useLocationSharing()
  const [tab, setTab] = useState<'active' | 'all'>('active')
  const [viewJobId, setViewJobId] = useState<string | null>(null)

  const jobsQuery = useMyJobs(driverProfile?.driverId)

  if (driverProfileLoading) {
    return (
      <PageScroll>
        <div className="p-6">
          <Skeleton className="h-40" />
        </div>
      </PageScroll>
    )
  }

  if (!driverProfile) {
    return (
      <PageScroll>
        <div className="mx-auto max-w-md p-6">
          <div className="rounded-lg border border-gray-200 bg-surface p-4 text-sm text-gray-500">
            Tu cuenta no está vinculada a un operador — solo los operadores tienen pedidos asignados aquí.
          </div>
        </div>
      </PageScroll>
    )
  }

  const rows = jobsQuery.data ?? []
  const visibleRows = tab === 'active' ? rows.filter((job) => ACTIVE_JOB_STATUSES.includes(job.status)) : rows

  return (
    <PageScroll>
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-10">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-ink">Mis pedidos</h1>
            <p className="text-sm text-gray-500">Hola {driverProfile.driverName}, estos son tus pedidos asignados.</p>
          </div>
          <Link
            to="/app/mapa"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-600"
          >
            <MapPinned size={14} strokeWidth={2} />
            Mapa
          </Link>
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setTab('active')}
            className={`flex-1 rounded-full border px-3 py-1.5 text-sm font-medium ${
              tab === 'active' ? 'border-accent-500 bg-accent-500 text-white' : 'border-gray-300 text-gray-600'
            }`}
          >
            Activos
          </button>
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`flex-1 rounded-full border px-3 py-1.5 text-sm font-medium ${
              tab === 'all' ? 'border-accent-500 bg-accent-500 text-white' : 'border-gray-300 text-gray-600'
            }`}
          >
            Todos
          </button>
        </div>

        {jobsQuery.isLoading && <Skeleton className="h-40" />}
        {jobsQuery.isError && <ErrorState message="No se pudieron cargar tus pedidos." onRetry={() => void jobsQuery.refetch()} />}

        {jobsQuery.isSuccess && visibleRows.length === 0 && (
          <EmptyState
            title={tab === 'active' ? 'Sin pedidos activos' : 'Sin pedidos asignados'}
            description={tab === 'active' ? 'No tienes pedidos pendientes en este momento.' : 'Todavía no te han asignado ningún pedido.'}
          />
        )}

        {visibleRows.map((job) => (
          <JobCard key={job.id} job={job} onOpen={() => setViewJobId(job.id)} />
        ))}
      </div>

      {viewJobId && (
        <Modal open title="Pedido" onClose={() => setViewJobId(null)}>
          <JobDetailContent id={viewJobId} onBack={() => setViewJobId(null)} backLabel="Cerrar" />
        </Modal>
      )}
    </PageScroll>
  )
}
