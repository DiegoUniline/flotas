import type { ReactNode } from 'react'
import { useEffect } from 'react'

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
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={closeOnBackdrop ? onClose : undefined} aria-hidden="true" />
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {description && <p className="text-sm text-gray-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-gray-200 px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}
