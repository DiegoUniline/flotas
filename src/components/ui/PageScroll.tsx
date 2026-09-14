import type { ReactNode } from 'react'

/**
 * Envuelve páginas que no usan el layout de lista 90/10 (fichas, formularios,
 * "próximamente"). AppShell ya no da scroll por sí mismo — cada página es
 * responsable de su propio scroll interno.
 */
export function PageScroll({ children }: { children: ReactNode }) {
  return <div className="h-full overflow-y-auto">{children}</div>
}
