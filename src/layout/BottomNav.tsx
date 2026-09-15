import { NavLink } from 'react-router-dom'
import { Home, Map, ClipboardList, Truck, Menu } from 'lucide-react'
import { usePermissions } from '@/context/PermissionsContext'

interface BottomNavItem {
  label: string
  to: string
  permission?: string
  icon: typeof Home
}

/** Los 4 destinos de más tráfico del sistema (punto 2: "3-5 destinos... no
 * llenar la barra con todos los módulos") — el resto vive detrás de "Más",
 * que abre el mismo overlay de sidebar que ya existe (mismo mecanismo,
 * ningún menú nuevo que mantener). */
const ITEMS: BottomNavItem[] = [
  { label: 'Inicio', to: '/inicio', icon: Home },
  { label: 'Mapa', to: '/centro-de-control', permission: 'locations.view', icon: Map },
  { label: 'Pedidos', to: '/pedidos', permission: 'jobs.view', icon: ClipboardList },
  { label: 'Vehículos', to: '/vehiculos', permission: 'vehicles.view', icon: Truck },
]

/** Navegación inferior del admin en celular — decisión tomada explícitamente
 * (punto 2 delegaba el criterio): el overlay de hamburguesa por sí solo
 * exige 2 toques (abrir menú + elegir ítem) para CUALQUIER destino, incluidos
 * los que se visitan todo el día (Centro de control, Pedidos, Vehículos). Una
 * barra inferior de 1 toque para esos + Inicio, con "Más" abriendo el mismo
 * overlay para el resto, reduce los pasos sin llenar la barra de los ~26
 * módulos del roadmap. Vive en el flujo normal (no `fixed`), así que el
 * `<main>` de arriba se reduce en vez de quedar tapado — ver `AppShell.tsx`. */
export function BottomNav({ onOpenMore, className = '' }: { onOpenMore: () => void; className?: string }) {
  const { can } = usePermissions()
  const visibleItems = ITEMS.filter((item) => !item.permission || can(item.permission))

  return (
    <nav
      className={`flex shrink-0 items-stretch border-t border-gray-200 bg-surface pb-[max(0.25rem,env(safe-area-inset-bottom))] ${className}`}
      aria-label="Navegación principal"
    >
      {visibleItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              isActive ? 'text-accent-600' : 'text-gray-500'
            }`
          }
        >
          <item.icon size={20} strokeWidth={2} />
          {item.label}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={onOpenMore}
        className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-gray-500"
      >
        <Menu size={20} strokeWidth={2} />
        Más
      </button>
    </nav>
  )
}
