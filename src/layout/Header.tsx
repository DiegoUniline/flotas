import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, MoreVertical, PanelLeft, Smartphone } from 'lucide-react'
import { OrgSwitcher } from '@/components/OrgSwitcher'
import { IconButton } from '@/components/ui/IconButton'
import { ThemeToggle, ThemeToggleMenuItem } from '@/components/ui/ThemeToggle'
import { InstallAppButton } from '@/components/pwa/InstallAppButton'
import { useAuth } from '@/context/AuthContext'
import { useLocationSharing } from '@/context/LocationSharingContext'
import { useClickOutside } from '@/hooks/useClickOutside'
import { signOut } from '@/features/auth/api/authApi'

/** Botón "App" — antes "Mis pedidos"/"Compartir ubicación"/"Sincronizar"
 * vivían como links sueltos aquí ("eso... esta horrible", pedido explícito
 * del usuario de consolidarlos). Ahora es un solo botón que lleva a
 * `/app` (`AppTabLayout`, menú inferior con esas 3 pantallas) — mismo gate
 * de siempre (`driverProfile`, solo operadores lo ven), con un punto verde
 * superpuesto si está compartiendo ubicación en vez de un texto aparte. */
function AppLink({ sharing, onClick, compact = false }: { sharing: boolean; onClick?: () => void; compact?: boolean }) {
  return (
    <Link
      to="/app"
      onClick={onClick}
      className={
        compact
          ? 'flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50'
          : 'relative flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-ink'
      }
    >
      <span className="relative">
        <Smartphone size={16} strokeWidth={2} />
        {sharing && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-status-active" />}
      </span>
      App
    </Link>
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
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <IconButton onClick={onToggleSidebar} aria-label="Alternar barra lateral">
          <PanelLeft size={18} strokeWidth={2} />
        </IconButton>
        <div className="min-w-0 truncate">
          <OrgSwitcher />
        </div>
      </div>

      {/* Fila completa desde `sm:` — en celular esto no cabría, se
          reemplaza por el menú compacto de abajo. */}
      <div className="hidden items-center gap-4 sm:flex">
        {driverProfile && <AppLink sharing={sharing} />}
        <InstallAppButton />
        <ThemeToggle />
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
        <div ref={menuRef} className="relative">
          <IconButton onClick={() => setMenuOpen((current) => !current)} aria-label="Más opciones">
            <MoreVertical size={18} strokeWidth={2} />
          </IconButton>

          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-gray-200 bg-surface py-1.5 shadow-lg">
              {driverProfile && (
                <>
                  <AppLink sharing={sharing} compact onClick={() => setMenuOpen(false)} />
                  <div className="my-1 border-t border-gray-100" />
                </>
              )}
              <div className="flex flex-col gap-2 px-3.5 py-2">
                <InstallAppButton />
              </div>
              <div className="my-1 border-t border-gray-100" />
              <ThemeToggleMenuItem />
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
