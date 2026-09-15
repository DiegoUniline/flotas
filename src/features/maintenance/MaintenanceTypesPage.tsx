import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { RecordList, type RecordListItem } from '@/components/ui/RecordList'
import { Can } from '@/components/Can'
import { MAINTENANCE_CATEGORIES, type MaintenanceType } from '@/features/maintenance/api/maintenanceTypesApi'
import { useMaintenanceTypesQuery } from '@/features/maintenance/hooks/useMaintenanceTypes'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'

const CATEGORY_LABEL = Object.fromEntries(MAINTENANCE_CATEGORIES.map((c) => [c.value, c.label]))

export function MaintenanceTypesPage() {
  const navigate = useNavigate()
  const typesQuery = useMaintenanceTypesQuery()
  const types = typesQuery.data ?? []
  // Catálogo secundario sin búsqueda/filtros/paginado propios (fetch completo,
  // pocos registros por organización) — no aplica `useListState` aquí porque
  // no hay ningún slice de filtro/orden/página que persistir, mismo criterio
  // de "no inventar" del resto del proyecto. Sí se conserva la posición de
  // scroll al volver de un detalle, igual que cualquier otra lista.
  const scrollRef = useScrollRestoration<HTMLDivElement>('maintenance-types-list')

  function toRecord(type: MaintenanceType): RecordListItem {
    return {
      id: type.id,
      onClick: type.organization_id ? () => navigate(`/mantenimientos/tipos/${type.id}`) : undefined,
      title: type.name,
      subtitle: CATEGORY_LABEL[type.category] ?? type.category,
      status: {
        label: type.organization_id ? 'Personalizado' : 'Predeterminado',
        tone: type.organization_id ? 'bg-accent-50 text-accent-700' : 'bg-gray-100 text-gray-500',
      },
      fields: [
        { label: 'Cada', value: type.interval_km != null ? `${Number(type.interval_km).toLocaleString('es-MX')} km` : '—' },
        { label: 'Cada', value: type.interval_days != null ? `${type.interval_days} días` : '—' },
      ],
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <button type="button" onClick={() => navigate('/mantenimientos')} className="mb-1 flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
            <ArrowLeft size={15} strokeWidth={2} />
            Mantenimientos
          </button>
          <h1 className="text-xl font-semibold text-ink">Tipos de servicio</h1>
          <p className="text-sm text-gray-500">Catálogo de servicios con su intervalo por kilometraje y/o por tiempo.</p>
        </div>
        <Can permission="maintenance.manage">
          <Button onClick={() => navigate('/mantenimientos/tipos/nuevo')}>Nuevo tipo</Button>
        </Can>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-surface">
        <TableScrollArea ref={scrollRef}>
          {typesQuery.isError && <ErrorState message="No se pudieron cargar los tipos de servicio." onRetry={() => void typesQuery.refetch()} />}
          {typesQuery.isLoading && <TableSkeleton columns={5} />}
          {!typesQuery.isLoading && !typesQuery.isError && types.length === 0 && (
            <EmptyState title="Sin tipos de servicio" description="Crea el primero para poder programar mantenimientos." />
          )}
          {!typesQuery.isLoading && !typesQuery.isError && types.length > 0 && (
            <>
              <div className="hidden sm:block">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-2">Nombre</th>
                      <th className="px-4 py-2">Categoría</th>
                      <th className="px-4 py-2">Cada (km)</th>
                      <th className="px-4 py-2">Cada (días)</th>
                      <th className="px-4 py-2">Origen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {types.map((type) => (
                      <tr
                        key={type.id}
                        onClick={() => type.organization_id && navigate(`/mantenimientos/tipos/${type.id}`)}
                        className={`border-b border-gray-100 ${type.organization_id ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      >
                        <td className="px-4 py-2 font-medium text-gray-900">{type.name}</td>
                        <td className="px-4 py-2 text-gray-700">{CATEGORY_LABEL[type.category] ?? type.category}</td>
                        <td className="px-4 py-2 text-gray-700">{type.interval_km != null ? Number(type.interval_km).toLocaleString('es-MX') : '—'}</td>
                        <td className="px-4 py-2 text-gray-700">{type.interval_days ?? '—'}</td>
                        <td className="px-4 py-2 text-gray-500">
                          {type.organization_id ? (
                            'Personalizado'
                          ) : (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">Predeterminado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <RecordList items={types.map(toRecord)} className="sm:hidden" />
            </>
          )}
        </TableScrollArea>
      </div>
    </div>
  )
}
