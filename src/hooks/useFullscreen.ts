import { useEffect, useState, type RefObject } from 'react'

/** Pantalla completa real (Fullscreen API del navegador, no un modal que
 * simula ocupar toda la pantalla) — pedido explícito del usuario para poder
 * ver dónde andan los operadores sin la interfaz alrededor estorbando.
 * Reutilizable en cualquier mapa (Centro de control, captura de GPS,
 * geocercas). */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(document.fullscreenElement != null && document.fullscreenElement === ref.current)
    }
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [ref])

  function toggle() {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void ref.current?.requestFullscreen()
    }
  }

  return { isFullscreen, toggle }
}
