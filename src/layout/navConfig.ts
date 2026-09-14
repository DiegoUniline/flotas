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
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Operación',
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
    items: [
      { label: 'Vehículos', to: '/vehiculos', permission: 'vehicles.view', icon: Truck, implemented: true },
      { label: 'Operadores', to: '/operadores', permission: 'drivers.view', icon: IdCard, implemented: true },
      { label: 'Dispositivos', to: '/dispositivos', permission: 'devices.manage', icon: Satellite, implemented: true },
      { label: 'Geocercas', to: '/geocercas', permission: 'geofences.manage', icon: MapPinned, implemented: true },
    ],
  },
  {
    label: 'Mantenimiento',
    items: [
      { label: 'Mantenimientos', to: '/mantenimientos', permission: 'maintenance.view', icon: Wrench, implemented: false },
      { label: 'Inspecciones', to: '/inspecciones', permission: 'inspections.perform', icon: ClipboardCheck, implemented: false },
      { label: 'Refacciones', to: '/refacciones', permission: 'maintenance.manage', icon: Package, implemented: false },
    ],
  },
  {
    label: 'Costos',
    items: [
      { label: 'Combustible', to: '/combustible', permission: 'fuel.manage', icon: Fuel, implemented: false },
      { label: 'Gastos', to: '/gastos', permission: 'expenses.view', icon: Receipt, implemented: false },
      { label: 'Costos', to: '/costos', permission: 'reports.view', icon: Calculator, implemented: false },
    ],
  },
  {
    label: 'Seguridad',
    items: [
      { label: 'Incidentes', to: '/incidentes', permission: 'alerts.view', icon: AlertTriangle, implemented: false },
      { label: 'Alertas', to: '/alertas', permission: 'alerts.view', icon: Bell, implemented: false },
      { label: 'Documentos', to: '/documentos', permission: 'drivers.view', icon: FileText, implemented: false },
    ],
  },
  {
    label: 'Analítica',
    items: [
      { label: 'Reportes', to: '/reportes', permission: 'reports.view', icon: BarChart3, implemented: false },
      { label: 'Indicadores', to: '/indicadores', permission: 'reports.view', icon: Gauge, implemented: false },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { label: 'Sucursales', to: '/sucursales', permission: 'locations.view', icon: Building2, implemented: true },
      { label: 'Usuarios', to: '/usuarios', permission: 'users.view', icon: Users, implemented: false },
      { label: 'Roles', to: '/roles', permission: 'roles.view', icon: ShieldCheck, implemented: false },
      { label: 'Campos personalizados', to: '/campos-personalizados', permission: 'settings.manage', icon: SlidersHorizontal, implemented: false },
      { label: 'Vistas', to: '/vistas', permission: 'settings.manage', icon: LayoutList, implemented: false },
      { label: 'Integraciones', to: '/integraciones', permission: 'api.manage', icon: Plug, implemented: false },
      { label: 'API', to: '/api', permission: 'api.manage', icon: Code2, implemented: false },
      { label: 'Empresa', to: '/empresa', permission: 'organization.view', icon: Building2, implemented: false },
      { label: 'Suscripción', to: '/suscripcion', permission: 'billing.manage', icon: CreditCard, implemented: false },
    ],
  },
]
