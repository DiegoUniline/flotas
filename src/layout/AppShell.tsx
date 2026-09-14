import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useOrg } from '@/context/OrgContext'
import { PermissionsProvider } from '@/context/PermissionsContext'
import { OnboardingWizard } from '@/features/onboarding/components/OnboardingWizard'
import { ErrorState } from '@/components/ui/ErrorState'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function AppShell() {
  const { loading, error, needsOnboarding, refetch } = useOrg()
  const [collapsed, setCollapsed] = useState(false)

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

  return (
    <PermissionsProvider>
      <div className="flex h-screen flex-col">
        <Header onToggleSidebar={() => setCollapsed((current) => !current)} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar collapsed={collapsed} />
          <main className="flex-1 overflow-hidden bg-gray-50">
            <Outlet />
          </main>
        </div>
      </div>
    </PermissionsProvider>
  )
}
