import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari/iOS no tiene display-mode: standalone confiable en todas las
    // versiones — expone su propio flag.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/** El navegador dispara `beforeinstallprompt` (Chrome/Edge/Android) cuando
 * la PWA cumple los requisitos de instalación (manifest válido + service
 * worker registrado) — lo interceptamos para poder ofrecer nuestro propio
 * botón "Instalar app" en vez de esperar el mini-infobar nativo. Safari/iOS
 * nunca dispara ese evento (no lo soporta), así que ahí se distingue aparte
 * para mostrar instrucciones en vez de un prompt nativo. */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }
    function onAppInstalled() {
      setInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  async function promptInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
  }

  return {
    installed,
    canInstall: !!deferredPrompt && !installed,
    // iOS nunca da un prompt nativo — mostramos instrucciones en vez de
    // ocultar el botón por completo, para que el operador sepa que sí puede
    // instalarla.
    needsIosInstructions: !installed && !deferredPrompt && isIos(),
    promptInstall,
  }
}
