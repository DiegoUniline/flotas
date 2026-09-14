import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { supabase } from '@/lib/supabase'
import { countLocations, fetchMappedLocations } from '@/features/map/api/mapApi'
import { fetchControlKpis, fetchDayJobs, fetchLiveVehiclePositions } from '@/features/map/api/controlApi'

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

/** Posiciones reales compartidas desde el celular del operador
 * (`update_my_vehicle_position`). Se suscribe a Supabase Realtime sobre
 * `vehicles` (habilitado en la migración `driver_phone_position_sharing`)
 * para refrescar en cuanto llega una posición nueva, sin esperar polling. */
export function useLiveVehiclePositions() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const queryKey = ['live-vehicle-positions', activeOrg?.id]

  useEffect(() => {
    if (!activeOrg) return
    const channel = supabase
      .channel(`vehicles-position-${activeOrg.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vehicles', filter: `organization_id=eq.${activeOrg.id}` },
        () => void queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe()
    return () => void supabase.removeChannel(channel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrg?.id])

  return useQuery({
    queryKey,
    queryFn: () => fetchLiveVehiclePositions(activeOrg!.id),
    enabled: !!activeOrg,
  })
}
