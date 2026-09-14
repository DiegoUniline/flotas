import type { ReactNode } from 'react'

export function TableScrollArea({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`min-h-0 flex-1 overflow-y-auto ${className}`}>{children}</div>
}
