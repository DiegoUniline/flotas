import { useQuery } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { countLocations, fetchMappedLocations } from '@/features/map/api/mapApi'
import { fetchControlKpis, fetchDayJobs } from '@/features/map/api/controlApi'

export function useMappedLocations() {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['map-locations', activeOrg?.id],
    queryFn: () => fetchMappedLocations(activeOrg!.id),
    enabled: !!activeOrg,
  })
}

export function useLocationCounts() {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['location-counts', activeOrg?.id],
    queryFn: () => countLocations(activeOrg!.id),
    enabled: !!activeOrg,
  })
}

export function useControlKpis(date: string) {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['control-kpis', activeOrg?.id, date],
    queryFn: () => fetchControlKpis(activeOrg!.id, date),
    enabled: !!activeOrg,
  })
}

export function useDayJobs(date: string) {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['control-day-jobs', activeOrg?.id, date],
    queryFn: () => fetchDayJobs(activeOrg!.id, date),
    enabled: !!activeOrg,
  })
}
