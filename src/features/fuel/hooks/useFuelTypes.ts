import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { createFuelType } from '@/features/fuel/api/fuelTypesApi'

export function useCreateFuelType() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => createFuelType(activeOrg!.id, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fuel-type-options', activeOrg?.id] })
    },
  })
}
