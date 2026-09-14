import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './AuthContext'
import {
  fetchMyOrganizations,
  fetchProfile,
  setActiveOrganization,
  type Organization,
} from '@/features/organizations/api/organizationsApi'

interface OrgContextValue {
  organizations: Organization[]
  activeOrg: Organization | null
  loading: boolean
  error: boolean
  needsOnboarding: boolean
  switchOrganization: (organizationId: string) => Promise<void>
  refetch: () => Promise<void>
}

const OrgContext = createContext<OrgContextValue | null>(null)

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  })

  const orgsQuery = useQuery({
    queryKey: ['my-organizations', user?.id],
    queryFn: fetchMyOrganizations,
    enabled: !!user,
  })

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      if (!user) return
      await setActiveOrganization(user.id, organizationId)
      queryClient.setQueryData(['profile', user.id], (previous: typeof profileQuery.data) =>
        previous ? { ...previous, active_organization_id: organizationId } : previous,
      )
    },
    [user, queryClient],
  )

  const refetch = useCallback(async () => {
    await Promise.all([profileQuery.refetch(), orgsQuery.refetch()])
  }, [profileQuery, orgsQuery])

  const activeOrg = useMemo(() => {
    const organizations = orgsQuery.data ?? []
    if (organizations.length === 0) return null
    const preferred = organizations.find((org) => org.id === profileQuery.data?.active_organization_id)
    return preferred ?? organizations[0]
  }, [orgsQuery.data, profileQuery.data?.active_organization_id])

  useEffect(() => {
    if (!activeOrg || !profileQuery.data) return
    if (profileQuery.data.active_organization_id === activeOrg.id) return
    void switchOrganization(activeOrg.id)
  }, [activeOrg, profileQuery.data, switchOrganization])

  const value: OrgContextValue = {
    organizations: orgsQuery.data ?? [],
    activeOrg,
    loading: profileQuery.isLoading || orgsQuery.isLoading,
    error: profileQuery.isError || orgsQuery.isError,
    needsOnboarding: !orgsQuery.isLoading && !orgsQuery.isError && (orgsQuery.data ?? []).length === 0,
    switchOrganization,
    refetch,
  }

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg() {
  const context = useContext(OrgContext)
  if (!context) throw new Error('useOrg debe usarse dentro de OrgProvider')
  return context
}
