import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Copy } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { DetailField, DetailGrid, DetailSection } from '@/components/ui/DetailGrid'
import { InlineField } from '@/components/ui/InlineField'
import { SaveDiscardBar } from '@/components/ui/SaveDiscardBar'
import { Can } from '@/components/Can'
import { setRolePermissions, type PermissionRow } from '@/features/roles/api/rolesApi'
import {
  useAllPermissions,
  useCreateRole,
  useDuplicateRoleAsCustom,
  useRole,
  useRolePermissionIds,
  useSetRolePermissions,
  useUpdateRole,
} from '@/features/roles/hooks/useRoles'

function groupByModule(permissions: PermissionRow[]): Map<string, PermissionRow[]> {
  const groups = new Map<string, PermissionRow[]>()
  for (const permission of permissions) {
    const list = groups.get(permission.module) ?? []
    list.push(permission)
    groups.set(permission.module, list)
  }
  return groups
}

export function RoleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'nuevo'
  const navigate = useNavigate()

  const roleQuery = useRole(isNew ? undefined : id)
  const permissionsQuery = useAllPermissions()
  const rolePermissionIdsQuery = useRolePermissionIds(isNew ? undefined : id)
  const createMutation = useCreateRole()
  const updateMutation = useUpdateRole()
  const setPermissionsMutation = useSetRolePermissions(isNew ? '' : (id ?? ''))
  const duplicateMutation = useDuplicateRoleAsCustom()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [initialIds, setInitialIds] = useState<Set<string>>(new Set())
  const [nameError, setNameError] = useState<string | null>(null)

  const role = roleQuery.data
  const isSystemRole = !isNew && role != null && role.organization_id == null

  useEffect(() => {
    if (role) {
      setName(role.name)
      setDescription(role.description ?? '')
    }
  }, [role])

  useEffect(() => {
    if (rolePermissionIdsQuery.data) {
      const ids = new Set(rolePermissionIdsQuery.data)
      setSelectedIds(ids)
      setInitialIds(ids)
    }
  }, [rolePermissionIdsQuery.data])

  const permissionsByModule = groupByModule(permissionsQuery.data ?? [])
  const nameDirty = !isNew && role ? name !== role.name || description !== (role.description ?? '') : false
  const permissionsDirty =
    selectedIds.size !== initialIds.size || [...selectedIds].some((id) => !initialIds.has(id))
  const dirty = isNew ? name.trim() !== '' : nameDirty || permissionsDirty

  function toggle(permissionId: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(permissionId)) next.delete(permissionId)
      else next.add(permissionId)
      return next
    })
  }

  function handleBack() {
    navigate('/roles')
  }

  function handleSave() {
    if (!name.trim()) {
      setNameError('Campo obligatorio')
      return
    }
    setNameError(null)

    if (isNew) {
      createMutation.mutate(
        { name, description: description || null, key: null, system_role: false, active: true },
        {
          onSuccess: async (created) => {
            if (selectedIds.size > 0) {
              await setRolePermissions(created.id, [...selectedIds])
            }
            navigate(`/roles/${created.id}`, { replace: true })
          },
        },
      )
      return
    }

    if (!id) return
    if (nameDirty) {
      updateMutation.mutate({ id, input: { name, description: description || null } })
    }
    if (permissionsDirty) {
      setPermissionsMutation.mutate([...selectedIds], { onSuccess: () => setInitialIds(selectedIds) })
    }
  }

  function handleDiscard() {
    if (isNew) {
      navigate('/roles')
      return
    }
    if (role) {
      setName(role.name)
      setDescription(role.description ?? '')
    }
    setSelectedIds(initialIds)
  }

  const saving = createMutation.isPending || updateMutation.isPending || setPermissionsMutation.isPending

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <button type="button" onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
          <ArrowLeft size={15} strokeWidth={2} />
          Roles
        </button>
        {isSystemRole && role && (
          <Can permission="roles.manage">
            <button
              type="button"
              onClick={() => duplicateMutation.mutate(role, { onSuccess: (created) => navigate(`/roles/${created.id}`) })}
              disabled={duplicateMutation.isPending}
              className="flex items-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700 disabled:opacity-50"
            >
              <Copy size={14} strokeWidth={2} />
              Duplicar como rol personalizado
            </button>
          </Can>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-white px-6 py-5">
        {!isNew && roleQuery.isLoading && <Skeleton className="h-64" />}
        {!isNew && roleQuery.isError && <ErrorState message="No se pudo cargar el rol." onRetry={() => void roleQuery.refetch()} />}

        {(isNew || role) && (
          <div className="flex max-w-3xl flex-col gap-4">
            <div>
              <h1 className="text-xl font-semibold text-ink">{name || (isNew ? 'Nuevo rol' : 'Rol')}</h1>
              {isSystemRole && (
                <p className="text-sm text-gray-500">
                  Rol de sistema, compartido por todas las organizaciones — de solo lectura. Duplícalo para crear tu propia versión.
                </p>
              )}
            </div>

            <DetailSection title="Datos" description="Nombre y descripción del rol.">
              <DetailGrid>
                <DetailField label="Nombre" required error={nameError ?? undefined}>
                  <InlineField value={name} onChange={setName} readOnly={isSystemRole} placeholder="Nombre del rol" />
                </DetailField>
                <DetailField label="Descripción" full>
                  <InlineField type="textarea" value={description} onChange={setDescription} readOnly={isSystemRole} />
                </DetailField>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="Permisos" description="Qué puede hacer alguien con este rol en el sistema.">
              {permissionsQuery.isLoading || (!isNew && rolePermissionIdsQuery.isLoading) ? (
                <Skeleton className="h-32" />
              ) : (
                <div className="flex flex-col gap-4">
                  {[...permissionsByModule.entries()].map(([module, permissions]) => (
                    <div key={module}>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">{module}</p>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {permissions.map((permission) => (
                          <label key={permission.id} className="flex items-start gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(permission.id)}
                              disabled={isSystemRole}
                              onChange={() => toggle(permission.id)}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300"
                            />
                            <span>
                              {permission.key}
                              {permission.description && <span className="block text-xs text-gray-400">{permission.description}</span>}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DetailSection>
          </div>
        )}
      </div>

      {!isSystemRole && <SaveDiscardBar dirty={dirty} saving={saving} onSave={handleSave} onDiscard={handleDiscard} />}
    </div>
  )
}
