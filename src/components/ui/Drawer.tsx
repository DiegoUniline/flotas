import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './IconButton'

interface DrawerProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function Drawer({ open, title, onClose, children, footer }: DrawerProps) {
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
    <div className="fixed inset-0 z-[1100] flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-full w-full max-w-md flex-col bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 py-2 pl-5 pr-2">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <IconButton onClick={onClose} aria-label="Cerrar">
            <X size={20} strokeWidth={2} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-gray-200 px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}
