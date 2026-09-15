import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { acceptOrganizationInvite, getInviteByToken, type InvitePublicInfo } from '@/features/invite/api/inviteAcceptApi'

export const PENDING_INVITE_TOKEN_KEY = 'flotaa:pending-invite-token'

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { session, user, loading: authLoading } = useAuth()
  const { showToast } = useToast()

  const [invite, setInvite] = useState<InvitePublicInfo | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (!token) return
    sessionStorage.setItem(PENDING_INVITE_TOKEN_KEY, token)
    getInviteByToken(token)
      .then(setInvite)
      .catch(() => setError('No se pudo cargar la invitación.'))
  }, [token])

  async function handleAccept() {
    if (!token) return
    setAccepting(true)
    setError(null)
    try {
      await acceptOrganizationInvite(token)
      sessionStorage.removeItem(PENDING_INVITE_TOKEN_KEY)
      showToast('Te uniste a la organización', 'success')
      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aceptar la invitación.')
      setAccepting(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (authLoading || invite === undefined) {
    return (
      <AuthLayout title="Cargando invitación…">
        <div className="flex justify-center py-4">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        </div>
      </AuthLayout>
    )
  }

  if (!invite) {
    return (
      <AuthLayout title="Invitación no encontrada">
        <p className="text-sm text-gray-600">Este enlace de invitación no es válido.</p>
      </AuthLayout>
    )
  }

  if (invite.status === 'accepted') {
    return (
      <AuthLayout title="Invitación ya utilizada">
        <p className="text-sm text-gray-600">Esta invitación ya fue aceptada.</p>
        <Button className="mt-4 w-full" onClick={() => navigate('/')}>
          Ir a FLOTAA
        </Button>
      </AuthLayout>
    )
  }

  if (invite.status === 'revoked' || invite.status === 'expired' || new Date(invite.expires_at) < new Date()) {
    return (
      <AuthLayout title="Invitación no disponible">
        <p className="text-sm text-gray-600">
          {invite.status === 'revoked' ? 'Esta invitación fue cancelada.' : 'Esta invitación ya expiró.'} Pide a quien te
          invitó que te comparta una nueva.
        </p>
      </AuthLayout>
    )
  }

  const currentEmail = user?.email?.toLowerCase()
  const inviteEmail = invite.email.toLowerCase()

  if (session && currentEmail && currentEmail !== inviteEmail) {
    return (
      <AuthLayout title="Invitación para otro correo">
        <p className="text-sm text-gray-600">
          Esta invitación es para <span className="font-medium">{invite.email}</span>, pero iniciaste sesión como{' '}
          <span className="font-medium">{user?.email}</span>.
        </p>
        <Button className="mt-4 w-full" variant="secondary" onClick={handleSignOut}>
          Cerrar sesión
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={`Te invitaron a unirte a ${invite.organization_name}`} subtitle={`Rol: ${invite.role_name}`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">
          Invitación para <span className="font-medium">{invite.email}</span>.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {session ? (
          <Button className="w-full" loading={accepting} onClick={handleAccept}>
            Aceptar invitación
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <Button className="w-full" onClick={() => navigate('/login', { state: { from: `/invitacion/${token}` } })}>
              Iniciar sesión
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => navigate(`/registro?email=${encodeURIComponent(invite.email)}`)}
            >
              Crear cuenta
            </Button>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
