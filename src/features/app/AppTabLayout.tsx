import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardList, LocateFixed, MapPinned, RefreshCw } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { useLocationSharing } from '@/context/LocationSharingContext'

const TABS = [
  { to: '/app/pedidos', label: 'Pedidos', icon: ClipboardList },
  { to: '/app/mapa', label: 'Mapa', icon: MapPinned },
  { to: '/app/ubicacion', label: 'Ubicación', icon: LocateFixed },
  { to: '/app/sincronizar', label: 'Sincronizar', icon: RefreshCw },
]

/** "App" del repartidor — pedido explícito del usuario tras ver "Mis
 * pedidos"/"Compartir ubicación"/"Sincronizar" desperdigados en el header
 * ("eso... deberia de haber un boton que diga app... con menu abajo"): un
 * solo botón en el header (gateado igual que antes por
 * `useLocationSharing().driverProfile`) trae al operador aquí, una sección
 * con menú inferior tipo app real en vez de links sueltos arriba. La
 * pestaña "Mapa" (`AppRouteMapPage`) se agregó después, también pedido
 * explícito: mapa con orden de entrega real + navegación al siguiente
 * destino. Sigue viviendo dentro del `AppShell` normal (mismo
 * `OrgProvider`/`PermissionsProvider`/`LocationSharingProvider`, la barra
 * lateral sigue existiendo en escritorio) — no es un shell aparte, solo un
 * layout propio para estas 4 pantallas (`MyJobsPage`/`AppRouteMapPage`/
 * `MiUbicacionPage`/`AppSyncPage`). */
export function AppTabLayout() {
  const navigate = useNavigate()
  const { sharing } = useLocationSharing()

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-gray-200 bg-surface py-1.5 pl-2 pr-3 pt-[max(0.375rem,env(safe-area-inset-top))]">
        <IconButton onClick={() => navigate('/centro-de-control')} aria-label="Volver">
          <ArrowLeft size={18} strokeWidth={2} />
        </IconButton>
        <span className="text-sm font-semibold text-ink">App del repartidor</span>
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
