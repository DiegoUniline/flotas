import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  createExpense,
  fetchExpenseById,
  fetchExpenses,
  setExpenseStatus,
  softDeleteExpense,
  updateExpense,
  type ExpenseFilters,
  type ExpenseInsert,
  type ExpenseSort,
  type ExpenseUpdate,
} from '@/features/expenses/api/expensesApi'

const PAGE_SIZE = 20

export function useExpensesQuery(filters: ExpenseFilters, sort: ExpenseSort, page: number) {
  const { activeOrg } = useOrg()

  return useQuery({
    queryKey: ['expenses', activeOrg?.id, filters, sort, page],
    queryFn: () => fetchExpenses(activeOrg!.id, filters, sort, page, PAGE_SIZE),
    enabled: !!activeOrg,
    placeholderData: keepPreviousData,
  })
}

export { PAGE_SIZE }

export function useExpense(id: string | undefined) {
  return useQuery({
    queryKey: ['expense', id],
    queryFn: () => fetchExpenseById(id!),
    enabled: !!id,
  })
}

export function useCreateExpense() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (input: ExpenseInsert) => createExpense(activeOrg!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses', activeOrg?.id] })
      showToast('Gasto registrado', 'success')
    },
    onError: () => showToast('No se pudo registrar el gasto', 'error'),
  })
}

export function useUpdateExpense() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ExpenseUpdate }) => updateExpense(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['expenses', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['expense', variables.id] })
      showToast('Gasto actualizado', 'success')
    },
    onError: () => showToast('No se pudo actualizar el gasto', 'error'),
  })
}

export function useDeleteExpense() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => softDeleteExpense(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses', activeOrg?.id] })
      showToast('Gasto eliminado', 'success')
    },
    onError: () => showToast('No se pudo eliminar el gasto', 'error'),
  })
}

export function useSetExpenseStatus() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'pending' | 'approved' | 'rejected' }) => setExpenseStatus(id, status),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['expenses', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['expense', variables.id] })
      const label = variables.status === 'approved' ? 'Gasto aprobado' : variables.status === 'rejected' ? 'Gasto rechazado' : 'Gasto marcado como pendiente'
      showToast(label, 'success')
    },
    onError: () => showToast('No se pudo actualizar el estado del gasto', 'error'),
  })
}
