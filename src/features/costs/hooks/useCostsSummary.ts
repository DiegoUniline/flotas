import { useQuery } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import type { DateRangeValue } from '@/lib/dateRanges'
import { fetchCostsSummary } from '@/features/costs/api/costsApi'

export function useCostsSummary(dateRange: DateRangeValue) {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['costs-summary', activeOrg?.id, dateRange],
    queryFn: () => fetchCostsSummary(activeOrg!.id, dateRange),
    enabled: !!activeOrg,
  })
}
