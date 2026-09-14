import { LogOut, PanelLeft } from 'lucide-react'
import { OrgSwitcher } from '@/components/OrgSwitcher'
import { useAuth } from '@/context/AuthContext'
import { signOut } from '@/features/auth/api/authApi'

export function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { user } = useAuth()

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-ink"
          aria-label="Alternar barra lateral"
        >
          <PanelLeft size={18} strokeWidth={2} />
        </button>
        <OrgSwitcher />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">{user?.email}</span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-ink"
        >
          <LogOut size={16} strokeWidth={2} />
          Cerrar sesión
        </button>
      </div>
    </header>
  )
}
