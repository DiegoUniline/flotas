import { useQuery } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { countLocations, fetchMappedLocations } from '@/features/map/api/mapApi'

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
