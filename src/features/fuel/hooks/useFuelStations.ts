import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { createFuelStation } from '@/features/fuel/api/fuelStationsApi'

export function useCreateFuelStation() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => createFuelStation(activeOrg!.id, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fuel-station-options', activeOrg?.id] })
    },
  })
}
