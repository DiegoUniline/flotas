import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from './AuthContext'
import { useOrg } from './OrgContext'
import { fetchPermissionKeys } from '@/features/permissions/api/permissionsApi'

interface PermissionsContextValue {
  loading: boolean
  can: (permission: string) => boolean
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null)

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { activeOrg } = useOrg()

  const query = useQuery({
    queryKey: ['permissions', activeOrg?.id, user?.id],
    queryFn: () => fetchPermissionKeys(activeOrg!.id, user!.id),
    enabled: !!activeOrg && !!user,
  })

  const permissionSet = useMemo(() => new Set(query.data ?? []), [query.data])

  const value: PermissionsContextValue = {
    loading: query.isLoading,
    can: (permission: string) => permissionSet.has(permission),
  }

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

export function usePermissions() {
  const context = useContext(PermissionsContext)
  if (!context) throw new Error('usePermissions debe usarse dentro de PermissionsProvider')
  return context
}
