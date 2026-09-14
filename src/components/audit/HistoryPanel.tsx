import { History } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { useEntityHistory } from '@/features/audit/hooks/useAuditLog'
import { diffAuditValues, formatValue } from '@/lib/auditDiff'

const ACTION_LABELS: Record<string, string> = {
  create: 'Creado',
  update: 'Actualizado',
  delete: 'Eliminado',
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

interface HistoryPanelProps {
  entityType: string
  entityId: string | undefined
}

export function HistoryPanel({ entityType, entityId }: HistoryPanelProps) {
  const historyQuery = useEntityHistory(entityType, entityId)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 border-b border-gray-100 px-4 py-3">
        <History size={15} strokeWidth={2} className="text-gray-400" />
        <h2 className="text-sm font-semibold text-ink">Historial de cambios</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {historyQuery.isLoading && <Skeleton className="h-32" />}

        {historyQuery.data && historyQuery.data.length === 0 && <p className="text-xs text-gray-400">Sin cambios registrados.</p>}

        {historyQuery.data && historyQuery.data.length > 0 && (
          <ol className="flex flex-col gap-4 border-l border-gray-200 pl-4">
            {historyQuery.data.map((entry) => {
              const changes = entry.action === 'update' ? diffAuditValues(entry.old_values, entry.new_values) : []
              const author = entry.profiles ? `${entry.profiles.first_name ?? ''} ${entry.profiles.last_name ?? ''}`.trim() : null

              return (
                <li key={entry.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-accent-500" />
                  <p className="text-xs font-semibold text-gray-900">{ACTION_LABELS[entry.action] ?? entry.action}</p>
                  <p className="text-xs text-gray-400">
                    {formatDateTime(entry.created_at)}
                    {author && ` · ${author}`}
                  </p>
                  {changes.length > 0 && (
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {changes.map((change) => (
                        <li key={change.field} className="text-xs text-gray-600">
                          <span className="font-medium text-gray-700">{change.field}:</span> {formatValue(change.from)} →{' '}
                          {formatValue(change.to)}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
