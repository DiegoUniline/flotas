import { useQuery } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { fetchMaintenanceDue } from '@/features/maintenance/api/maintenanceDueApi'

export function useMaintenanceDue() {
  const { activeOrg } = useOrg()
  return useQuery({
    queryKey: ['maintenance-due', activeOrg?.id],
    queryFn: () => fetchMaintenanceDue(activeOrg!.id),
    enabled: !!activeOrg,
  })
}
