import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  createCustomer,
  fetchCustomerOptions,
  fetchCustomers,
  softDeleteCustomer,
  updateCustomer,
  type CustomerFilters,
  type CustomerInsert,
  type CustomerSort,
  type CustomerUpdate,
} from '@/features/customers/api/customersApi'

const PAGE_SIZE = 20

export function useCustomersQuery(filters: CustomerFilters, sort: CustomerSort, page: number) {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['customers', activeOrg?.id, filters, sort, page],
    queryFn: () => fetchCustomers(activeOrg!.id, filters, sort, page, PAGE_SIZE),
    enabled: !!activeOrg,
    placeholderData: keepPreviousData,
  })
}

export { PAGE_SIZE }

export function useCustomerOptions() {
  const { activeOrg } = useOrg()
  return useQuery({
    queryKey: ['customer-options', activeOrg?.id],
    queryFn: () => fetchCustomerOptions(activeOrg!.id),
    enabled: !!activeOrg,
  })
}

export function useCreateCustomer() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (input: CustomerInsert) => createCustomer(activeOrg!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['customer-options', activeOrg?.id] })
      showToast('Cliente creado', 'success')
    },
    onError: () => showToast('No se pudo crear el cliente', 'error'),
  })
}

export function useUpdateCustomer() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CustomerUpdate }) => updateCustomer(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['customers', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['customer-options', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['customer', variables.id] })
      showToast('Cliente actualizado', 'success')
    },
    onError: () => showToast('No se pudo actualizar el cliente', 'error'),
  })
}

export function useDeleteCustomer() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => softDeleteCustomer(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['customer-options', activeOrg?.id] })
      showToast('Cliente eliminado', 'success')
    },
    onError: () => showToast('No se pudo eliminar el cliente', 'error'),
  })
}
