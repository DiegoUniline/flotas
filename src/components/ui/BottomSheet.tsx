import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './IconButton'

interface BottomSheetProps {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
  /** Ancla el sheet al botón que lo abre en escritorio en vez de flotar al
   * centro — por defecto se comporta como un popover normal desde `sm:`
   * (mismo patrón ya usado por `FilterPanel`) y como hoja fija al fondo de
   * la pantalla en celular. Pasar `anchored={false}` para un selector corto
   * que en escritorio también debe verse centrado/flotante en vez de
   * anclado (poco común, la mayoría de usos son anclados). */
  anchorClassName?: string
}

/** Panel inferior genérico — extraído del patrón que `FilterPanel` ya
 * improvisaba (hoja fija al fondo en celular, popover anclado desde `sm:`).
 * Úsalo para cualquier selector/menú corto nuevo en vez de `Modal` (reservado
 * para formularios largos/pantalla completa) o un dropdown absoluto propio
 * (se sale de la pantalla en celular sin importar dónde esté el botón que lo
 * abre — mismo bug real que ya se corrigió en `FilterPanel`).
 *
 * El padre es responsable de posicionar el trigger (`relative`) — este
 * componente solo resuelve el panel en sí. */
export function BottomSheet({ open, title, onClose, children, anchorClassName = '' }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-[1100] bg-black/30 sm:hidden" onClick={onClose} aria-hidden="true" />
      <div
        className={`fixed inset-x-0 bottom-0 z-[1100] max-h-[75vh] overflow-y-auto rounded-t-xl border-t border-gray-200 bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:z-20 sm:mt-1 sm:max-h-none sm:rounded-md sm:border sm:p-3 sm:pb-3 sm:shadow-lg ${anchorClassName}`}
      >
        {title && (
          <div className="mb-2 flex items-center justify-between sm:hidden">
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <IconButton size="sm" onClick={onClose} aria-label="Cerrar">
              <X size={16} strokeWidth={2} />
            </IconButton>
          </div>
        )}
        {children}
      </div>
    </>
  )
}
