import type { ReactNode } from 'react'
import { usePermissions } from '@/context/PermissionsContext'

export function Can({ permission, children }: { permission: string; children: ReactNode }) {
  const { can } = usePermissions()
  if (!can(permission)) return null
  return <>{children}</>
}
