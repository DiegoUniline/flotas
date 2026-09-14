import { Map, Building2, type LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  permission: string
  icon: LucideIcon
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Operación',
    items: [{ label: 'Centro de control', to: '/centro-de-control', permission: 'locations.view', icon: Map }],
  },
  { label: 'Flota', items: [] },
  { label: 'Mantenimiento', items: [] },
  { label: 'Costos', items: [] },
  { label: 'Seguridad', items: [] },
  { label: 'Analítica', items: [] },
  {
    label: 'Configuración',
    items: [
      { label: 'Sucursales', to: '/sucursales', permission: 'locations.view', icon: Building2 },
    ],
  },
]
