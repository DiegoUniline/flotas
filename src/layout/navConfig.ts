export interface NavItem {
  label: string
  to: string
  permission: string
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  { label: 'Operación', items: [] },
  { label: 'Flota', items: [] },
  { label: 'Mantenimiento', items: [] },
  { label: 'Costos', items: [] },
  { label: 'Seguridad', items: [] },
  { label: 'Analítica', items: [] },
  {
    label: 'Configuración',
    items: [{ label: 'Sucursales', to: '/sucursales', permission: 'locations.view' }],
  },
]
