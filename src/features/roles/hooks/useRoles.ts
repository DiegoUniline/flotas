import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  createRole,
  duplicateRoleAsCustom,
  fetchAllPermissions,
  fetchRoleById,
  fetchRolePermissionIds,
  fetchRoles,
  setRolePermissions,
  updateRole,
  type Role,
  type RoleInsert,
  type RoleUpdate,
} from '@/features/roles/api/rolesApi'

export function useRolesQuery() {
  const { activeOrg } = useOrg()
  return useQuery({ queryKey: ['roles', activeOrg?.id], queryFn: () => fetchRoles(activeOrg!.id), enabled: !!activeOrg })
}

export function useRole(id: string | undefined) {
  return useQuery({ queryKey: ['role', id], queryFn: () => fetchRoleById(id!), enabled: !!id })
}

export function useAllPermissions() {
  return useQuery({ queryKey: ['permissions-catalog'], queryFn: fetchAllPermissions })
}

export function useRolePermissionIds(roleId: string | undefined) {
  return useQuery({ queryKey: ['role-permission-ids', roleId], queryFn: () => fetchRolePermissionIds(roleId!), enabled: !!roleId })
}

export function useCreateRole() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (input: RoleInsert) => createRole(activeOrg!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['roles', activeOrg?.id] })
      showToast('Rol creado', 'success')
    },
    onError: () => showToast('No se pudo crear el rol', 'error'),
  })
}

export function useUpdateRole() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RoleUpdate }) => updateRole(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['roles', activeOrg?.id] })
      void queryClient.invalidateQueries({ queryKey: ['role', variables.id] })
      showToast('Rol actualizado', 'success')
    },
    onError: () => showToast('No se pudo actualizar el rol', 'error'),
  })
}

export function useSetRolePermissions(roleId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (permissionIds: string[]) => setRolePermissions(roleId, permissionIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['role-permission-ids', roleId] })
      showToast('Permisos actualizados', 'success')
    },
    onError: () => showToast('No se pudieron actualizar los permisos', 'error'),
  })
}

export function useDuplicateRoleAsCustom() {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (sourceRole: Role) => duplicateRoleAsCustom(activeOrg!.id, sourceRole),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['roles', activeOrg?.id] })
      showToast('Rol duplicado — ya puedes personalizarlo', 'success')
    },
    onError: () => showToast('No se pudo duplicar el rol', 'error'),
  })
}
