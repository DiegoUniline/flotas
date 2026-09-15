import { X } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

// `slate-800`, no `gray-800`: la escala `gray-*` se invierte en modo oscuro
// (ver src/index.css), y este chip debe seguir oscuro con texto blanco sin
// importar el tema — `slate` es una escala aparte que no se toca.
const VARIANT_STYLES: Record<string, string> = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-slate-800',
}

export function ToastViewport() {
  const { toasts, dismissToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[1300] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`${VARIANT_STYLES[toast.variant]} flex items-center gap-2 rounded-md py-2.5 pl-4 pr-2 text-sm text-white shadow-lg`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="flex shrink-0 items-center justify-center rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      ))}
    </div>
  )
}
