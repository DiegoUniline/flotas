import { useQuery } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { fetchEntityHistory } from '@/features/audit/api/auditLogApi'

export function useEntityHistory(entityType: string, entityId: string | undefined) {
  const { activeOrg } = useOrg()
  return useQuery({
    queryKey: ['audit-log', entityType, entityId],
    queryFn: () => fetchEntityHistory(activeOrg!.id, entityType, entityId!),
    enabled: !!activeOrg && !!entityId,
  })
}
