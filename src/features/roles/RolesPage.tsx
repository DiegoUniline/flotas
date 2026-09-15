import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { useRolesQuery } from '@/features/roles/hooks/useRoles'

export function RolesPage() {
  const navigate = useNavigate()
  const rolesQuery = useRolesQuery()
  const roles = rolesQuery.data ?? []

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Roles</h1>
          <p className="text-sm text-gray-500">
            Roles de sistema (compartidos, solo lectura) y roles personalizados de tu organización.
          </p>
        </div>
        <Can permission="roles.manage">
          <Button onClick={() => navigate('/roles/nuevo')}>Nuevo rol</Button>
        </Can>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-white">
        {rolesQuery.isLoading && (
          <div className="p-4">
            <Skeleton className="h-32" />
          </div>
        )}
        {rolesQuery.isError && <ErrorState message="No se pudieron cargar los roles." onRetry={() => void rolesQuery.refetch()} />}
        {roles.length > 0 && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Descripción</th>
                <th className="px-4 py-2">Origen</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} onClick={() => navigate(`/roles/${role.id}`)} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">{role.name}</td>
                  <td className="px-4 py-2 text-gray-500">{role.description ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {role.organization_id ? (
                      'Personalizado'
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">Sistema</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
