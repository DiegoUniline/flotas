import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageScroll } from '@/components/ui/PageScroll'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { useOrg } from '@/context/OrgContext'
import { useQuery } from '@tanstack/react-query'
import { formatDate } from '@/lib/format'
import {
  DOCUMENT_SOURCE_LABEL,
  DOCUMENT_STATUS_LABEL,
  fetchAllDocuments,
  type DocumentSource,
  type DocumentStatus,
} from './api/documentsApi'

const STATUS_TONE: Record<DocumentStatus, string> = {
  expired: 'bg-red-50 text-red-600',
  expiring_soon: 'bg-status-delayed-bg text-status-delayed',
  valid: 'bg-status-active-bg text-status-active',
  no_expiry: 'bg-gray-100 text-gray-500',
}

export function DocumentsPage() {
  const { activeOrg } = useOrg()
  const [sourceFilter, setSourceFilter] = useState<DocumentSource | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all')

  const documentsQuery = useQuery({
    queryKey: ['documents-index', activeOrg?.id],
    queryFn: () => fetchAllDocuments(activeOrg!.id),
    enabled: !!activeOrg,
  })

  const rows = documentsQuery.data ?? []

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (sourceFilter !== 'all' && row.source !== sourceFilter) return false
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      return true
    })
  }, [rows, sourceFilter, statusFilter])

  const counts = useMemo(() => {
    const c: Record<DocumentStatus, number> = { expired: 0, expiring_soon: 0, valid: 0, no_expiry: 0 }
    for (const row of rows) c[row.status] += 1
    return c
  }, [rows])

  return (
    <PageScroll>
      <div className="flex flex-col gap-4 p-4">
        <div>
          <h1 className="text-lg font-semibold text-ink">Documentos</h1>
          <p className="text-sm text-gray-500">
            Licencias, certificaciones y documentos de vehículo con vencimiento — índice de solo lectura, edita cada documento desde la
            ficha del operador o vehículo dueño.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-surface px-4 py-3">
            <p className="text-lg font-semibold text-red-600">{counts.expired}</p>
            <p className="text-xs text-gray-500">Vencidos</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-surface px-4 py-3">
            <p className="text-lg font-semibold text-status-delayed">{counts.expiring_soon}</p>
            <p className="text-xs text-gray-500">Próximos a vencer (30 días)</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-surface px-4 py-3">
            <p className="text-lg font-semibold text-status-active">{counts.valid}</p>
            <p className="text-xs text-gray-500">Vigentes</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-surface px-4 py-3">
            <p className="text-lg font-semibold text-gray-500">{counts.no_expiry}</p>
            <p className="text-xs text-gray-500">Sin vencimiento</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as DocumentSource | 'all')}
            className="min-h-11 rounded-md border border-gray-300 px-3 text-sm text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          >
            <option value="all">Todos los tipos</option>
            <option value="license">Licencias</option>
            <option value="certification">Certificaciones</option>
            <option value="vehicle_document">Documentos de vehículo</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | 'all')}
            className="min-h-11 rounded-md border border-gray-300 px-3 text-sm text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          >
            <option value="all">Todos los estados</option>
            <option value="expired">Vencidos</option>
            <option value="expiring_soon">Próximos a vencer</option>
            <option value="valid">Vigentes</option>
            <option value="no_expiry">Sin vencimiento</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-surface">
          {documentsQuery.isLoading && <div className="p-4"><Skeleton className="h-48" /></div>}
          {documentsQuery.isError && (
            <div className="p-4">
              <ErrorState message="No se pudo cargar el índice de documentos." onRetry={() => void documentsQuery.refetch()} />
            </div>
          )}
          {documentsQuery.data && filtered.length === 0 && (
            <EmptyState title="Sin documentos" description="No hay documentos que coincidan con los filtros." />
          )}
          {documentsQuery.data && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2">Documento</th>
                    <th className="px-4 py-2">Tipo</th>
                    <th className="px-4 py-2">Dueño</th>
                    <th className="px-4 py-2">Vence</th>
                    <th className="px-4 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={`${row.source}-${row.id}`} className="border-b border-gray-100">
                      <td className="px-4 py-2 font-medium text-gray-900">{row.documentType}</td>
                      <td className="px-4 py-2 text-gray-700">{DOCUMENT_SOURCE_LABEL[row.source]}</td>
                      <td className="px-4 py-2 text-gray-700">
                        <Link to={row.linkTo} className="text-accent-600 hover:underline">
                          {row.ownerLabel}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-gray-700">{row.expiresAt ? formatDate(row.expiresAt) : '—'}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[row.status]}`}>
                          {DOCUMENT_STATUS_LABEL[row.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageScroll>
  )
}
