import { OrgSwitcher } from '@/components/OrgSwitcher'
import { useAuth } from '@/context/AuthContext'
import { signOut } from '@/features/auth/api/authApi'

export function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { user } = useAuth()

  return (
    <header className="flex h-12 items-center justify-between border-b border-gray-200 bg-white px-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
          aria-label="Alternar barra lateral"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-900">FLOTAA</span>
        <OrgSwitcher />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{user?.email}</span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  )
}
