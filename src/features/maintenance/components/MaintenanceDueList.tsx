import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Can } from '@/components/Can'
import { formatDate } from '@/lib/format'
import { DUE_STATUS_LABEL as STATUS_LABEL, DUE_STATUS_TONE as STATUS_TONE, type DueRow } from '@/features/maintenance/api/maintenanceDueApi'

interface MaintenanceDueListProps {
  rows: DueRow[]
  className?: string
}

/** Hermano de `RecordList` para "Próximos vencimientos" — mismo lenguaje
 * visual (franja delgada, título + badge de estado, campos secundarios en
 * una línea envolvente) pero NO reutiliza `RecordList` en sí: cada fila
 * aquí no navega a un detalle propio (un vencimiento es un cálculo
 * derivado, no una entidad con ficha) — su acción real es "Programar", así
 * que en vez de una fila-tocable-completa con chevron, cada fila termina en
 * un botón real de ancho completo (44px+, no un link chico) como acción
 * primaria clara. Reutiliza los mismos `STATUS_LABEL`/`STATUS_TONE` que ya
 * usa la tabla de escritorio, no duplica el mapa de colores. */
export function MaintenanceDueList({ rows, className = '' }: MaintenanceDueListProps) {
  const navigate = useNavigate()

  return (
    <ul className={`divide-y divide-gray-100 ${className}`}>
      {rows.map((row) => (
        <li key={`${row.vehicleId}:${row.maintenanceTypeId}`} className="px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-gray-900">{row.vehicleLabel}</p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[row.status]}`}>
              {STATUS_LABEL[row.status]}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-gray-500">{row.maintenanceTypeName}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="text-xs text-gray-500">
              <span className="text-gray-400">Último: </span>
              <span className="text-gray-700">
                {row.lastDoneDate ? formatDate(row.lastDoneDate) : 'Sin registro'}
                {row.lastDoneOdometer != null && ` · ${Number(row.lastDoneOdometer).toLocaleString('es-MX')} km`}
              </span>
            </span>
            <span className="text-xs text-gray-500">
              <span className="text-gray-400">Vence: </span>
              <span className="text-gray-700">
                {row.nextDueDate && formatDate(row.nextDueDate)}
                {row.nextDueDate && row.nextDueOdometer != null && ' · '}
                {row.nextDueOdometer != null && `${Number(row.nextDueOdometer).toLocaleString('es-MX')} km`}
                {!row.nextDueDate && row.nextDueOdometer == null && '—'}
              </span>
            </span>
          </div>
          <Can permission="maintenance.manage">
            <Button
              variant="secondary"
              className="mt-2.5 w-full"
              onClick={() => navigate(`/mantenimientos/nuevo?vehicle_id=${row.vehicleId}&maintenance_type_id=${row.maintenanceTypeId}`)}
            >
              Programar
            </Button>
          </Can>
        </li>
      ))}
    </ul>
  )
}
