import type { ReactNode } from 'react'

export function DetailGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">{children}</div>
}

interface DetailSectionProps {
  title: string
  description?: string
  children: ReactNode
}

/** Agrupa un DetailGrid relacionado dentro de una tarjeta con título — para
 * separar visualmente secciones largas de una ficha (identificación, estado,
 * notas, etc.), en vez de un único bloque de campos sin jerarquía. */
export function DetailSection({ title, description, children }: DetailSectionProps) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      {children}
    </div>
  )
}

interface DetailFieldProps {
  label: string
  children: ReactNode
  /** Ocupa la fila completa (las 4 columnas visuales) en vez de la mitad. */
  full?: boolean
  htmlFor?: string
}

export function DetailField({ label, children, full = false, htmlFor }: DetailFieldProps) {
  return (
    <div className={`grid grid-cols-[120px_1fr] items-start gap-x-3 ${full ? 'sm:col-span-2' : ''}`}>
      <label htmlFor={htmlFor} className="pt-1.5 text-sm font-semibold text-gray-700">
        {label}
      </label>
      <div>{children}</div>
    </div>
  )
}
