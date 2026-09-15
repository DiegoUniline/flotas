import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './IconButton'

interface ModalProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** false = ni el fondo ni Escape cierran el modal — solo lo cierra una
   * acción explícita del footer (Cancelar) o el botón ×. Para wizards con
   * varios pasos, donde perder el progreso por un clic accidental fuera del
   * modal sería muy costoso. Default true (comportamiento de modal normal). */
  closeOnBackdrop?: boolean
}

/** Ventana emergente centrada y ancha (a diferencia de `Drawer`, que es
 * angosto y lateral) — para flujos tipo wizard con varios campos por paso,
 * donde un Drawer de max-w-md quedaría demasiado apretado. */
export function Modal({ open, title, description, onClose, children, footer, closeOnBackdrop = true }: ModalProps) {
  useEffect(() => {
    if (!open || !closeOnBackdrop) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, closeOnBackdrop])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={closeOnBackdrop ? onClose : undefined} aria-hidden="true" />
      {/* Pantalla completa en móvil (celular real, no una tarjeta flotando
          con márgenes que le roban ancho útil a un wizard de varios pasos)
          — vuelve a ser el diálogo centrado de siempre desde `sm:` para
          arriba. `pt-[env(safe-area-inset-top)]`/`pb-[...]` en el header y
          footer para no quedar debajo de la isla dinámica/home indicator
          cuando corre instalada. */}
      <div className="relative flex h-full w-full flex-col bg-surface shadow-xl sm:h-auto sm:max-h-[88vh] sm:w-full sm:max-w-5xl sm:rounded-lg">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:py-5 sm:pt-5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-gray-900 sm:text-lg">{title}</h2>
            {description && <p className="text-sm text-gray-500">{description}</p>}
          </div>
          <IconButton onClick={onClose} aria-label="Cerrar">
            <X size={20} strokeWidth={2} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer && (
          <div className="border-t border-gray-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4 sm:pb-4">{footer}</div>
        )}
      </div>
    </div>
  )
}
