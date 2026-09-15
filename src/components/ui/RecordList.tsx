import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

export interface RecordListField {
  label: string
  value: ReactNode
}

export interface RecordListStatus {
  label: string
  /** Clases Tailwind de fondo+texto — reutiliza el mismo mapa `STATUS_TONE`
   * que cada módulo ya tiene para su tabla de escritorio, no inventar uno
   * nuevo por componente. */
  tone: string
}

export interface RecordListItem {
  id: string
  onClick?: () => void
  /** Nombre/identificador principal del registro (punto 4: siempre primero). */
  title: ReactNode
  /** Dato secundario inmediato bajo el título (p. ej. "Marca modelo", cliente). */
  subtitle?: ReactNode
  status?: RecordListStatus
  /** 2-4 datos más relevantes — el resto vive en el detalle, no aquí. */
  fields?: RecordListField[]
}

export interface RecordListGroup {
  key: string
  label: ReactNode
  items: RecordListItem[]
}

interface RecordListProps {
  items?: RecordListItem[]
  groups?: RecordListGroup[]
  className?: string
}

function Row({ item }: { item: RecordListItem }) {
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
          {item.status && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${item.status.tone}`}>
              {item.status.label}
            </span>
          )}
        </div>
        {item.subtitle && <p className="mt-0.5 truncate text-xs text-gray-500">{item.subtitle}</p>}
        {item.fields && item.fields.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {item.fields.map((field, i) => (
              <span key={i} className="text-xs text-gray-500">
                <span className="text-gray-400">{field.label}: </span>
                <span className="text-gray-700">{field.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      {item.onClick && <ChevronRight size={16} strokeWidth={2} className="ml-1 mt-0.5 shrink-0 text-gray-300" />}
    </>
  )

  if (!item.onClick) {
    return <div className="flex items-start gap-2 px-4 py-3">{content}</div>
  }

  return (
    <button type="button" onClick={item.onClick} className="flex w-full items-start gap-2 px-4 py-3 text-left active:bg-gray-50">
      {content}
    </button>
  )
}

/** Lista compacta de registros para celular — punto 4 de la pasada de UX
 * móvil: NO es "cada fila de tabla convertida en tarjeta grande". Cada fila
 * es una franja delgada (sin tarjeta/borde propio) mostrando: título,
 * badge de estado si aplica, y 2-4 campos secundarios en una sola línea
 * envolvente — la fila completa es el área táctil (44px+ de alto real) que
 * navega al detalle, igual que la fila de `<tr>` en escritorio.
 *
 * `groups` (opcional) reproduce el modo "Agrupar por" que ya existe en las
 * tablas de escritorio (`groupRows` + `FilterPanel`) — mismo criterio de
 * "no reinventar la función, solo cómo se ve": aquí no colapsa (el genérico
 * de escritorio si), un encabezado gris con el nombre del grupo y su conteo
 * separa cada bloque. */
export function RecordList({ items, groups, className = '' }: RecordListProps) {
  if (groups) {
    return (
      <div className={className}>
        {groups.map((group) => (
          <div key={group.key}>
            <div className="border-b border-gray-100 bg-gray-50/70 px-4 py-1.5 text-xs font-semibold text-gray-600">
              {group.label} <span className="font-normal text-gray-400">({group.items.length})</span>
            </div>
            <ul className="divide-y divide-gray-100">
              {group.items.map((item) => (
                <li key={item.id}>
                  <Row item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    )
  }

  return (
    <ul className={`divide-y divide-gray-100 ${className}`}>
      {(items ?? []).map((item) => (
        <li key={item.id}>
          <Row item={item} />
        </li>
      ))}
    </ul>
  )
}
