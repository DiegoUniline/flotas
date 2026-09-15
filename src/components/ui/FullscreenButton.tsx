import { Maximize, Minimize } from 'lucide-react'

interface FullscreenButtonProps {
  isFullscreen: boolean
  onToggle: () => void
  className?: string
}

/** Botón de pantalla completa real, compartido por los 3 mapas de la app
 * (Centro de control, captura de GPS, geocercas) — mismo estilo de overlay
 * que ya usaban "Mapa/Satélite" y "Mi ubicación". */
export function FullscreenButton({ isFullscreen, onToggle, className = '' }: FullscreenButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
      className={`flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-surface text-gray-600 shadow-sm hover:bg-gray-50 ${className}`}
    >
      {isFullscreen ? <Minimize size={15} strokeWidth={2} /> : <Maximize size={15} strokeWidth={2} />}
    </button>
  )
}
