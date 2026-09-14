import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import { fetchCustomerById } from '@/features/customers/api/customersApi'
import {
  createCustomerLocation,
  deleteCustomerLocation,
  fetchCustomerLocations,
  updateCustomerLocation,
  type CustomerLocationInsert,
  type CustomerLocationUpdate,
} from '@/features/customers/api/customerLocationsApi'

export function useCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => fetchCustomerById(customerId!),
    enabled: !!customerId,
  })
}

export function useCustomerLocations(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer-locations', customerId],
    queryFn: () => fetchCustomerLocations(customerId!),
    enabled: !!customerId,
  })
}

export function useCreateCustomerLocation(customerId: string) {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (input: CustomerLocationInsert) => createCustomerLocation(activeOrg!.id, customerId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customer-locations', customerId] })
      showToast('Domicilio agregado', 'success')
    },
    onError: () => showToast('No se pudo agregar el domicilio', 'error'),
  })
}

export function useUpdateCustomerLocation(customerId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CustomerLocationUpdate }) => updateCustomerLocation(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customer-locations', customerId] })
      showToast('Domicilio actualizado', 'success')
    },
    onError: () => showToast('No se pudo actualizar el domicilio', 'error'),
  })
}

export function useDeleteCustomerLocation(customerId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (id: string) => deleteCustomerLocation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customer-locations', customerId] })
      showToast('Domicilio eliminado', 'success')
    },
    onError: () => showToast('No se pudo eliminar el domicilio', 'error'),
  })
}
