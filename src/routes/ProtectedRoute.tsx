import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { PENDING_INVITE_TOKEN_KEY } from '@/features/invite/InviteAcceptPage'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Si el usuario llegó aquí con una invitación pendiente sin resolver (ej.
  // confirmó su correo tras registrarse desde un enlace de invitación y
  // Supabase lo regresó a la raíz del sitio, no a /invitacion/:token),
  // lo mandamos a terminar de aceptarla antes de continuar.
  const pendingToken = sessionStorage.getItem(PENDING_INVITE_TOKEN_KEY)
  if (pendingToken && !location.pathname.startsWith('/invitacion/')) {
    return <Navigate to={`/invitacion/${pendingToken}`} replace />
  }

  return <>{children}</>
}
