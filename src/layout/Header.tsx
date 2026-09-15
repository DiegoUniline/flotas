import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, LocateFixed, LogOut, MoreVertical, PanelLeft } from 'lucide-react'
import { OrgSwitcher } from '@/components/OrgSwitcher'
import { InstallAppButton } from '@/components/pwa/InstallAppButton'
import { SyncOfflineDataButton } from '@/features/offlineSync/components/SyncOfflineDataButton'
import { useAuth } from '@/context/AuthContext'
import { useLocationSharing } from '@/context/LocationSharingContext'
import { useClickOutside } from '@/hooks/useClickOutside'
import { signOut } from '@/features/auth/api/authApi'

/** Indicador "compartiendo ubicación" — punto verde pulsante reutilizado
 * en el link de escritorio y como badge suelto en el menú compacto de
 * celular. */
function SharingDot() {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-active opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-status-active" />
    </span>
  )
}

export function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { user } = useAuth()
  const { driverProfile, sharing } = useLocationSharing()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-surface px-3 pt-[env(safe-area-inset-top)] sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="shrink-0 rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-ink sm:p-1.5"
          aria-label="Alternar barra lateral"
        >
          <PanelLeft size={18} strokeWidth={2} />
        </button>
        <div className="min-w-0 truncate">
          <OrgSwitcher />
        </div>
      </div>

      {/* Fila completa desde `sm:` — en celular esto no cabría, se
          reemplaza por el menú compacto de abajo. */}
      <div className="hidden items-center gap-4 sm:flex">
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
              {sharing ? <SharingDot /> : <LocateFixed size={16} strokeWidth={2} />}
              {sharing ? 'Compartiendo ubicación' : 'Compartir mi ubicación'}
            </Link>
          </>
        )}
        <SyncOfflineDataButton compact />
        <InstallAppButton />
        <span className="max-w-[220px] truncate text-sm text-gray-500">{user?.email}</span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-ink"
        >
          <LogOut size={16} strokeWidth={2} />
          Cerrar sesión
        </button>
      </div>

      {/* Menú compacto en celular: todo lo de arriba cabe en un solo
          botón "⋮" en vez de amontonarse y desbordar el header. */}
      <div className="flex items-center gap-1 sm:hidden">
        {driverProfile && sharing && (
          <span title="Compartiendo ubicación" className="p-2">
            <SharingDot />
          </span>
        )}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Más opciones"
          >
            <MoreVertical size={18} strokeWidth={2} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-gray-200 bg-surface py-1.5 shadow-lg">
              {driverProfile && (
                <>
                  <Link
                    to="/mis-pedidos"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <ClipboardList size={16} strokeWidth={2} />
                    Mis pedidos
                  </Link>
                  <Link
                    to="/mi-ubicacion"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <LocateFixed size={16} strokeWidth={2} />
                    {sharing ? 'Compartiendo ubicación' : 'Compartir mi ubicación'}
                  </Link>
                  <div className="my-1 border-t border-gray-100" />
                </>
              )}
              <div className="flex flex-col gap-2 px-3.5 py-2">
                <SyncOfflineDataButton />
                <InstallAppButton />
              </div>
              <div className="my-1 border-t border-gray-100" />
              <p className="truncate px-3.5 py-1.5 text-xs text-gray-400">{user?.email}</p>
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <LogOut size={16} strokeWidth={2} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
