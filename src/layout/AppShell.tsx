import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useOrg } from '@/context/OrgContext'
import { PermissionsProvider } from '@/context/PermissionsContext'
import { LocationSharingProvider } from '@/context/LocationSharingContext'
import { OnboardingWizard } from '@/features/onboarding/components/OnboardingWizard'
import { ErrorState } from '@/components/ui/ErrorState'
import { useAutoSyncOfflineData } from '@/features/offlineSync/hooks/useOfflineSync'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function AppShell() {
  const { loading, error, needsOnboarding, refetch } = useOrg()
  const location = useLocation()
  // El mismo botón de hamburguesa del header significa cosas distintas
  // según el ancho real: en escritorio alterna el sidebar a solo-íconos
  // (`collapsed`); en celular abre/cierra el overlay completo
  // (`mobileNavOpen`) — nunca los dos a la vez, por eso se necesita saber
  // el breakpoint real en JS, no solo con clases `lg:`.
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  // Antes de cualquier `return` condicional de abajo — reglas de hooks. La
  // sincronización automática (al recuperar señal, o la primera vez sin
  // nada sincronizado todavía) vive aquí porque es lo primero que se monta
  // con una organización activa resuelta.
  useAutoSyncOfflineData()

  // Cierra el overlay móvil al navegar — sin esto, tocar un ítem del menú
  // dejaría el sidebar tapando la pantalla nueva.
  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <ErrorState
          message="No se pudo cargar tu información de empresa."
          onRetry={() => void refetch()}
        />
      </div>
    )
  }

  if (needsOnboarding) {
    return <OnboardingWizard />
  }

  // "App del repartidor" (`/app/*`) es su propia experiencia tipo app
  // móvil nativa, con su propio header + menú inferior (`AppTabLayout`) —
  // pedido explícito del usuario ("cuando navegan a la app móvil no ven
  // el escritorio"). Antes esas pantallas seguían viviendo DENTRO del
  // `<main>` de este shell, así que el header/sidebar de escritorio
  // (OrgSwitcher, hamburguesa, etc.) se seguía viendo encima — dos headers
  // apilados, nada de "app real". Aquí se salta ese chrome por completo
  // para esas rutas (los providers de abajo sí se conservan, es la misma
  // sesión/organización/permiso de siempre, solo cambia qué se pinta).
  const isAppSection = location.pathname.startsWith('/app')

  return (
    <PermissionsProvider>
      <LocationSharingProvider>
        {isAppSection ? (
          <div className="h-screen bg-gray-50">
            <Outlet />
          </div>
        ) : (
          <div className="flex h-screen flex-col">
            <Header onToggleSidebar={() => (isDesktop ? setCollapsed((c) => !c) : setMobileNavOpen((o) => !o))} />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar iconOnly={collapsed && isDesktop} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} isDesktop={isDesktop} />
              <main className="flex-1 overflow-hidden bg-gray-50">
                <Outlet />
              </main>
            </div>
          </div>
        )}
      </LocationSharingProvider>
    </PermissionsProvider>
  )
}
