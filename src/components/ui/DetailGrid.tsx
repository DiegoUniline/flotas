import type { ReactNode } from 'react'

export function DetailGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">{children}</div>
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
