import { Link } from 'react-router-dom'
import { ClipboardList, LocateFixed, LogOut, PanelLeft } from 'lucide-react'
import { OrgSwitcher } from '@/components/OrgSwitcher'
import { useAuth } from '@/context/AuthContext'
import { useLocationSharing } from '@/context/LocationSharingContext'
import { signOut } from '@/features/auth/api/authApi'

export function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { user } = useAuth()
  const { driverProfile, sharing } = useLocationSharing()

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-ink"
          aria-label="Alternar barra lateral"
        >
          <PanelLeft size={18} strokeWidth={2} />
        </button>
        <OrgSwitcher />
      </div>
      <div className="flex items-center gap-4">
        {driverProfile && (
          <>
            <Link
              to="/mis-pedidos"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-ink"
            >
              <ClipboardList size={16} strokeWidth={2} />
              Mis pedidos
            </Link>
            <Link
              to="/mi-ubicacion"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-accent-600 hover:bg-accent-50"
            >
              {sharing ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-active opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-status-active" />
                </span>
              ) : (
                <LocateFixed size={16} strokeWidth={2} />
              )}
              {sharing ? 'Compartiendo ubicación' : 'Compartir mi ubicación'}
            </Link>
          </>
        )}
        <span className="text-sm text-gray-500">{user?.email}</span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-ink"
        >
          <LogOut size={16} strokeWidth={2} />
          Cerrar sesión
        </button>
      </div>
    </header>
  )
}
