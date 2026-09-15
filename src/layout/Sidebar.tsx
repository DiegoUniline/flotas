import { NavLink } from 'react-router-dom'
import { useMemo } from 'react'
import { Truck } from 'lucide-react'
import { NAV_SECTIONS } from './navConfig'
import { usePermissions } from '@/context/PermissionsContext'

interface SidebarProps {
  /** Modo "solo íconos" de escritorio (`lg:` en adelante) — nunca aplica
   * en celular, ahí el sidebar siempre se ve completo porque es un
   * overlay que se abre/cierra entero, no algo que compita por ancho con
   * el contenido. */
  iconOnly: boolean
  /** Controla el overlay en celular (`< lg`) — no tiene efecto en
   * escritorio, donde el sidebar siempre está visible en el flujo normal. */
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ iconOnly, mobileOpen, onCloseMobile }: SidebarProps) {
  const { can } = usePermissions()

  const sections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => !item.permission || can(item.permission)),
      })).filter((section) => section.items.length > 0),
    [can],
  )

  return (
    <>
      {/* Fondo del overlay en celular — no existe en `lg:` porque ahí el
          sidebar ya no es un overlay, es parte del layout normal. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onCloseMobile} aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col border-r border-gray-200 bg-white transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-auto lg:translate-x-0 lg:transition-[width] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${iconOnly ? 'lg:w-16' : 'lg:w-60'}`}
      >
        <div className="flex items-center gap-2 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-500 text-white">
            <Truck size={18} strokeWidth={2.25} />
          </span>
          {!iconOnly && <span className="text-base font-extrabold tracking-tight text-ink">FLOTAA</span>}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {sections.map((section) => (
            <div key={section.label} className="mb-5">
              {!iconOnly && (
                <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {section.label}
                </p>
              )}
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onCloseMobile}
                      title={iconOnly ? item.label : undefined}
                      className={({ isActive }) =>
                        `group flex items-center gap-2.5 rounded-lg border-l-[3px] px-2.5 py-2.5 text-sm font-medium transition-colors lg:py-2 ${
                          isActive
                            ? 'border-accent-500 bg-accent-50 text-accent-600'
                            : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-ink'
                        } ${iconOnly ? 'justify-center' : ''}`
                      }
                    >
                      <item.icon size={18} strokeWidth={2} className="shrink-0" />
                      {!iconOnly && (
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span className="truncate">{item.label}</span>
                          {!item.implemented && (
                            <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                              Próximamente
                            </span>
                          )}
                        </span>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
