import { NavLink } from 'react-router-dom'
import { useMemo } from 'react'
import { Truck } from 'lucide-react'
import { NAV_SECTIONS } from './navConfig'
import { usePermissions } from '@/context/PermissionsContext'

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const { can } = usePermissions()

  const sections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => can(item.permission)),
      })).filter((section) => section.items.length > 0),
    [can],
  )

  return (
    <aside
      className={`flex h-full flex-col border-r border-gray-200 bg-white transition-all ${collapsed ? 'w-16' : 'w-60'}`}
    >
      {!collapsed && (
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500 text-white">
            <Truck size={18} strokeWidth={2.25} />
          </span>
          <span className="text-base font-extrabold tracking-tight text-ink">FLOTAA</span>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {sections.map((section) => (
          <div key={section.label} className="mb-5">
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {section.label}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `group flex items-center gap-2.5 rounded-lg border-l-[3px] px-2.5 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'border-accent-500 bg-accent-50 text-accent-600'
                          : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-ink'
                      } ${collapsed ? 'justify-center' : ''}`
                    }
                  >
                    <item.icon size={18} strokeWidth={2} className="shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
