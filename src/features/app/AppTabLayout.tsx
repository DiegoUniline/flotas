import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardList, LocateFixed, LogOut, MapPinned, MoreVertical, RefreshCw } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { ThemeToggleMenuItem } from '@/components/ui/ThemeToggle'
import { InstallAppButton } from '@/components/pwa/InstallAppButton'
import { useLocationSharing } from '@/context/LocationSharingContext'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useClickOutside } from '@/hooks/useClickOutside'
import { signOut } from '@/features/auth/api/authApi'

const TABS = [
  { to: '/app/pedidos', label: 'Pedidos', icon: ClipboardList },
  { to: '/app/mapa', label: 'Mapa', icon: MapPinned },
  { to: '/app/ubicacion', label: 'Ubicación', icon: LocateFixed },
  { to: '/app/sincronizar', label: 'Sincronizar', icon: RefreshCw },
]

/** Botón sencillo de "Compartir ubicación" en el header — pedido explícito
 * del usuario ("compartir ubicacion deberia de ser un boton arriba en el
 * header"): un tap prende/apaga el envío (`start`/`stop` de
 * `LocationSharingContext`, que ya vive a nivel de `AppShell` y sobrevive a
 * cualquier navegación). El anillo `animate-ping` es la animación real de
 * "enviando" (mismo patrón ya usado en los marcadores de posición en vivo
 * del Centro de control) — no decorativo, solo se pinta mientras `sharing`
 * es real. Si el navegador niega el permiso o falla el GPS, `start()` deja
 * `error` con un mensaje real en el contexto; acá se muestra como toast en
 * cuanto cambia, para "que le pida" en vez de fallar en silencio. */
function LocationShareButton() {
  const { driverProfile, sharing, error, start, stop } = useLocationSharing()
  const { showToast } = useToast()
  const lastShownError = useRef<string | null>(null)

  useEffect(() => {
    if (error && error !== lastShownError.current) showToast(error, 'error')
    lastShownError.current = error
  }, [error, showToast])

  if (!driverProfile?.vehicle) return null

  return (
    <button
      type="button"
      onClick={() => (sharing ? stop() : start())}
      aria-label={sharing ? 'Dejar de compartir ubicación' : 'Compartir mi ubicación'}
      aria-pressed={sharing}
      title={sharing ? 'Dejar de compartir ubicación' : 'Compartir mi ubicación'}
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
        sharing ? 'bg-status-active-bg text-status-active' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      <LocateFixed size={18} strokeWidth={2} />
      {sharing && (
        <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-active opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-status-active" />
        </span>
      )}
    </button>
  )
}

/** "···" — perfil y lo que aplique (tema, instalar la app, cerrar sesión),
 * mismo contenido que el menú compacto del header de escritorio pero
 * propio de esta sección, ya que aquí no existe el header global. */
function MoreMenu() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false), open)

  return (
    <div ref={ref} className="relative">
      <IconButton onClick={() => setOpen((current) => !current)} aria-label="Más opciones">
        <MoreVertical size={18} strokeWidth={2} />
      </IconButton>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-gray-200 bg-surface py-1.5 shadow-lg">
          <p className="truncate px-3.5 py-1.5 text-xs text-gray-400">{user?.email}</p>
          <div className="my-1 border-t border-gray-100" />
          <div className="flex flex-col gap-2 px-3.5 py-2">
            <InstallAppButton />
          </div>
          <div className="my-1 border-t border-gray-100" />
          <ThemeToggleMenuItem />
          <div className="my-1 border-t border-gray-100" />
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
  )
}

/** "App" del repartidor — pantalla completa tipo app móvil nativa, sin el
 * header/sidebar de escritorio de `AppShell` (que ahora se salta por
 * completo para `/app/*`, ver el comentario ahí). Header propio con volver
 * + botón de ubicación + "···", menú inferior de siempre para las 4
 * pestañas (`MyJobsPage`/`AppRouteMapPage`/`MiUbicacionPage`/`AppSyncPage`). */
export function AppTabLayout() {
  const navigate = useNavigate()
  const { sharing } = useLocationSharing()

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="flex shrink-0 items-center justify-between gap-1.5 border-b border-gray-200 bg-surface py-1.5 pl-2 pr-2 pt-[max(0.375rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-1.5">
          <IconButton onClick={() => navigate('/centro-de-control')} aria-label="Volver">
            <ArrowLeft size={18} strokeWidth={2} />
          </IconButton>
          <span className="truncate text-sm font-semibold text-ink">App del repartidor</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <LocationShareButton />
          <MoreMenu />
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <Outlet />
      </div>

      <nav className="flex shrink-0 border-t border-gray-200 bg-surface pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium active:bg-gray-50 ${
                isActive ? 'text-accent-600' : 'text-gray-500'
              }`
            }
          >
            <tab.icon size={20} strokeWidth={2} />
            {tab.label}
            {tab.to === '/app/ubicacion' && sharing && (
              <span className="absolute right-[calc(50%-18px)] top-1 h-2 w-2 rounded-full bg-status-active" />
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
