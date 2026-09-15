import { useRef, useState } from 'react'
import { Share, Download } from 'lucide-react'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

/** Botón "Instalar app" del header — visible para cualquier usuario, no
 * solo operadores. En Chrome/Edge/Android dispara el prompt nativo de
 * instalación (`beforeinstallprompt`, capturado en `useInstallPrompt`). En
 * iOS/Safari, que nunca da ese prompt, muestra instrucciones cortas para
 * "Agregar a inicio" desde el botón Compartir — sin eso el botón no tendría
 * ningún efecto visible ahí y parecería roto. Si la app ya está instalada
 * (`display-mode: standalone`), no se muestra nada. */
export function InstallAppButton() {
  const { canInstall, needsIosInstructions, installed, promptInstall } = useInstallPrompt()
  const [showIosHelp, setShowIosHelp] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setShowIosHelp(false), showIosHelp)

  if (installed || (!canInstall && !needsIosInstructions)) return null

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => (canInstall ? void promptInstall() : setShowIosHelp((current) => !current))}
        className="flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <Download size={15} strokeWidth={2} />
        Instalar app
      </button>

      {showIosHelp && (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-600 shadow-lg">
          <p className="mb-2 font-medium text-ink">Instalar en tu iPhone/iPad</p>
          <ol className="list-decimal space-y-1 pl-4">
            <li className="flex items-center gap-1">
              Toca <Share size={13} strokeWidth={2} className="inline" /> (Compartir) en Safari
            </li>
            <li>Elige "Agregar a inicio"</li>
            <li>Listo — se abre como app, funciona sin conexión</li>
          </ol>
        </div>
      )}
    </div>
  )
}
