import { NavLink } from 'react-router-dom'
import { useMemo } from 'react'
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
      className={`flex h-full flex-col border-r border-gray-200 bg-white transition-all ${collapsed ? 'w-14' : 'w-56'}`}
    >
      <nav className="flex-1 overflow-y-auto py-3">
        {sections.map((section) => (
          <div key={section.label} className="mb-4 px-2">
            {!collapsed && (
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
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
                      `block rounded-md px-2 py-1.5 text-sm font-medium ${
                        isActive
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      } ${collapsed ? 'text-center' : ''}`
                    }
                  >
                    {collapsed ? item.label.charAt(0) : item.label}
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
