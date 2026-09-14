import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { useCustomer } from '@/features/customers/hooks/useCustomerDetail'
import { CustomerLocationsSection } from './components/CustomerLocationsSection'

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const customerQuery = useCustomer(id)

  return (
    <div className="flex flex-col gap-4 p-6">
      <Link to="/clientes" className="flex w-fit items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
        <ArrowLeft size={15} strokeWidth={2} />
        Clientes
      </Link>

      {customerQuery.isLoading && <Skeleton className="h-24" />}
      {customerQuery.isError && (
        <ErrorState message="No se pudo cargar el cliente." onRetry={() => void customerQuery.refetch()} />
      )}

      {customerQuery.data && (
        <>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h1 className="text-lg font-semibold text-ink">{customerQuery.data.name}</h1>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm text-gray-600 sm:grid-cols-3">
              {customerQuery.data.phone && <p>Tel: {customerQuery.data.phone}</p>}
              {customerQuery.data.email && <p>Correo: {customerQuery.data.email}</p>}
              {customerQuery.data.tax_id && <p>RFC: {customerQuery.data.tax_id}</p>}
            </div>
          </div>

          <CustomerLocationsSection customerId={customerQuery.data.id} />
        </>
      )}
    </div>
  )
}
