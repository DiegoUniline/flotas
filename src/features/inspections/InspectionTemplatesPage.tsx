import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TableScrollArea } from '@/components/ui/TableScrollArea'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { RecordList, type RecordListItem } from '@/components/ui/RecordList'
import { Can } from '@/components/Can'
import { useInspectionTemplatesQuery } from '@/features/inspections/hooks/useInspectionTemplates'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import type { Tables } from '@/types/database'

type InspectionTemplate = Tables<'inspection_templates'>

export function InspectionTemplatesPage() {
  const navigate = useNavigate()
  const templatesQuery = useInspectionTemplatesQuery()
  const templates = templatesQuery.data ?? []
  // Catálogo secundario sin búsqueda/filtros/paginado propios (fetch completo,
  // pocos registros por organización) — no aplica `useListState` aquí porque
  // no hay ningún slice de filtro/orden/página que persistir, mismo criterio
  // de "no inventar" del resto del proyecto. Sí se conserva la posición de
  // scroll al volver de un detalle, igual que cualquier otra lista.
  const scrollRef = useScrollRestoration<HTMLDivElement>('inspection-templates-list')

  function toRecord(template: InspectionTemplate): RecordListItem {
    return {
      id: template.id,
      onClick: () => navigate(`/inspecciones/plantillas/${template.id}`),
      title: template.name,
      status: {
        label: template.active ? 'Activa' : 'Inactiva',
        tone: template.active ? 'bg-status-active-bg text-status-active' : 'bg-gray-100 text-gray-500',
      },
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <button type="button" onClick={() => navigate('/inspecciones')} className="mb-1 flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
            <ArrowLeft size={15} strokeWidth={2} />
            Inspecciones
          </button>
          <h1 className="text-xl font-semibold text-ink">Plantillas de inspección</h1>
          <p className="text-sm text-gray-500">Checklists que se aplican al inspeccionar un vehículo.</p>
        </div>
        <Can permission="inspections.perform">
          <Button onClick={() => navigate('/inspecciones/plantillas/nuevo')}>Nueva plantilla</Button>
        </Can>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-surface">
        <TableScrollArea ref={scrollRef}>
          {templatesQuery.isError && (
            <ErrorState message="No se pudieron cargar las plantillas." onRetry={() => void templatesQuery.refetch()} />
          )}
          {templatesQuery.isLoading && <TableSkeleton columns={2} />}
          {!templatesQuery.isLoading && !templatesQuery.isError && templates.length === 0 && (
            <EmptyState title="Sin plantillas" description="Crea la primera plantilla para poder realizar inspecciones." />
          )}
          {!templatesQuery.isLoading && !templatesQuery.isError && templates.length > 0 && (
            <>
              <div className="hidden sm:block">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-2">Nombre</th>
                      <th className="px-4 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((template) => (
                      <tr key={template.id} onClick={() => navigate(`/inspecciones/plantillas/${template.id}`)} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900">{template.name}</td>
                        <td className="px-4 py-2 text-gray-500">
                          {template.active ? (
                            <span className="rounded-full bg-status-active-bg px-2 py-0.5 text-xs text-status-active">Activa</span>
                          ) : (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inactiva</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <RecordList items={templates.map(toRecord)} className="sm:hidden" />
            </>
          )}
        </TableScrollArea>
      </div>
    </div>
  )
}
