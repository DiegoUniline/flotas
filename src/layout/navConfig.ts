import {
  Home,
  Map,
  Route,
  ClipboardList,
  Truck,
  IdCard,
  Satellite,
  MapPinned,
  Wrench,
  ClipboardCheck,
  Package,
  Fuel,
  Receipt,
  Calculator,
  AlertTriangle,
  Bell,
  FileText,
  BarChart3,
  Gauge,
  Building2,
  Users,
  Contact,
  ShieldCheck,
  SlidersHorizontal,
  LayoutList,
  Plug,
  Code2,
  CreditCard,
  Compass,
  ShieldAlert,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  /** Si se omite, el ítem es visible para cualquier miembro de la organización. */
  permission?: string
  icon: LucideIcon
  /** false = módulo en el roadmap, todavía no construido (muestra "Próximamente"). */
  implemented: boolean
}

export interface NavSection {
  label: string
  /** Ícono representativo de la sección — con el sidebar colapsado se
   * muestra UNA fila por sección (este ícono), no una por cada ítem; ver
   * `Sidebar.tsx`. Al pasar el cursor se despliega el flyout con los
   * ítems reales de la sección. */
  icon: LucideIcon
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Operación',
    icon: Compass,
    items: [
      { label: 'Inicio', to: '/inicio', icon: Home, implemented: false },
      { label: 'Centro de control', to: '/centro-de-control', permission: 'locations.view', icon: Map, implemented: true },
      { label: 'Rutas', to: '/rutas', permission: 'routes.view', icon: Route, implemented: true },
      { label: 'Pedidos', to: '/pedidos', permission: 'jobs.view', icon: ClipboardList, implemented: true },
      { label: 'Clientes', to: '/clientes', permission: 'jobs.view', icon: Contact, implemented: true },
    ],
  },
  {
    label: 'Flota',
    icon: Truck,
    items: [
      { label: 'Vehículos', to: '/vehiculos', permission: 'vehicles.view', icon: Truck, implemented: true },
      { label: 'Operadores', to: '/operadores', permission: 'drivers.view', icon: IdCard, implemented: true },
      { label: 'Dispositivos', to: '/dispositivos', permission: 'devices.manage', icon: Satellite, implemented: true },
      { label: 'Geocercas', to: '/geocercas', permission: 'geofences.manage', icon: MapPinned, implemented: true },
    ],
  },
  {
    label: 'Mantenimiento',
    icon: Wrench,
    items: [
      { label: 'Mantenimientos', to: '/mantenimientos', permission: 'maintenance.view', icon: Wrench, implemented: true },
      { label: 'Inspecciones', to: '/inspecciones', permission: 'inspections.perform', icon: ClipboardCheck, implemented: true },
      { label: 'Refacciones', to: '/refacciones', permission: 'maintenance.manage', icon: Package, implemented: true },
    ],
  },
  {
    label: 'Costos',
    icon: Calculator,
    items: [
      { label: 'Combustible', to: '/combustible', permission: 'fuel.manage', icon: Fuel, implemented: true },
      { label: 'Gastos', to: '/gastos', permission: 'expenses.view', icon: Receipt, implemented: true },
      { label: 'Costos', to: '/costos', permission: 'reports.view', icon: Calculator, implemented: true },
    ],
  },
  {
    label: 'Seguridad',
    icon: ShieldAlert,
    items: [
      { label: 'Incidentes', to: '/incidentes', permission: 'alerts.view', icon: AlertTriangle, implemented: false },
      { label: 'Alertas', to: '/alertas', permission: 'alerts.view', icon: Bell, implemented: false },
      { label: 'Documentos', to: '/documentos', permission: 'drivers.view', icon: FileText, implemented: false },
    ],
  },
  {
    label: 'Analítica',
    icon: BarChart3,
    items: [
      { label: 'Reportes', to: '/reportes', permission: 'reports.view', icon: BarChart3, implemented: false },
      { label: 'Indicadores', to: '/indicadores', permission: 'reports.view', icon: Gauge, implemented: false },
    ],
  },
  {
    label: 'Configuración',
    icon: Settings,
    items: [
      { label: 'Sucursales', to: '/sucursales', permission: 'locations.view', icon: Building2, implemented: true },
      { label: 'Usuarios', to: '/usuarios', permission: 'users.view', icon: Users, implemented: true },
      { label: 'Roles', to: '/roles', permission: 'roles.view', icon: ShieldCheck, implemented: true },
      { label: 'Campos personalizados', to: '/campos-personalizados', permission: 'settings.manage', icon: SlidersHorizontal, implemented: false },
      { label: 'Vistas', to: '/vistas', permission: 'settings.manage', icon: LayoutList, implemented: false },
      { label: 'Integraciones', to: '/integraciones', permission: 'api.manage', icon: Plug, implemented: false },
      { label: 'API', to: '/api', permission: 'api.manage', icon: Code2, implemented: false },
      { label: 'Empresa', to: '/empresa', permission: 'organization.view', icon: Building2, implemented: true },
      { label: 'Suscripción', to: '/suscripcion', permission: 'billing.manage', icon: CreditCard, implemented: false },
    ],
  },
]
