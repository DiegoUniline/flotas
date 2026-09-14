import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { useDriver } from '@/features/drivers/hooks/useDriverDetail'
import { DRIVER_STATUSES } from '@/features/drivers/api/driversApi'
import { DriverLicensesSection } from './components/DriverLicensesSection'
import { DriverCertificationsSection } from './components/DriverCertificationsSection'
import { DriverAssignmentSection } from './components/DriverAssignmentSection'
import { PageScroll } from '@/components/ui/PageScroll'

const STATUS_LABELS = Object.fromEntries(DRIVER_STATUSES.map((s) => [s.value, s.label]))

export function DriverDetailPage() {
  const { id } = useParams<{ id: string }>()
  const driverQuery = useDriver(id)

  return (
    <PageScroll>
    <div className="flex flex-col gap-4 p-6">
      <Link to="/operadores" className="flex w-fit items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
        <ArrowLeft size={15} strokeWidth={2} />
        Operadores
      </Link>

      {driverQuery.isLoading && <Skeleton className="h-24" />}
      {driverQuery.isError && (
        <ErrorState message="No se pudo cargar el operador." onRetry={() => void driverQuery.refetch()} />
      )}

      {driverQuery.data && (
        <>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-ink">
                  {driverQuery.data.first_name} {driverQuery.data.last_name}
                </h1>
                <p className="text-sm text-gray-500">
                  {driverQuery.data.employee_number ? `No. ${driverQuery.data.employee_number} · ` : ''}
                  {STATUS_LABELS[driverQuery.data.status] ?? driverQuery.data.status}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-600 sm:grid-cols-3">
              {driverQuery.data.phone && <p>Tel: {driverQuery.data.phone}</p>}
              {driverQuery.data.email && <p>Correo: {driverQuery.data.email}</p>}
              {driverQuery.data.hire_date && <p>Ingreso: {driverQuery.data.hire_date}</p>}
            </div>
          </div>

          <DriverAssignmentSection driverId={driverQuery.data.id} />
          <DriverLicensesSection driverId={driverQuery.data.id} />
          <DriverCertificationsSection driverId={driverQuery.data.id} />
        </>
      )}
    </div>
    </PageScroll>
  )
}
