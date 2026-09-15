import { useEffect, useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { RelationSelect } from '@/components/ui/RelationSelect'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useOrg } from '@/context/OrgContext'
import { searchRoles } from '@/features/roles/api/rolesApi'
import { searchLocations } from '@/features/locations/api/locationsApi'
import type { OrganizationMemberWithRelations } from '@/features/users/api/organizationMembersApi'
import { useRemoveOrganizationMember, useUpdateOrganizationMember } from '@/features/users/hooks/useOrganizationMembers'

const STATUS_OPTIONS: { value: 'active' | 'suspended'; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'suspended', label: 'Suspendido' },
]

interface MemberEditDrawerProps {
  member: OrganizationMemberWithRelations | null
  onClose: () => void
}

export function MemberEditDrawer({ member, onClose }: MemberEditDrawerProps) {
  const { activeOrg } = useOrg()
  const updateMutation = useUpdateOrganizationMember()
  const removeMutation = useRemoveOrganizationMember()

  const [roleId, setRoleId] = useState<string | null>(null)
  const [roleLabel, setRoleLabel] = useState<string | null>(null)
  const [locationId, setLocationId] = useState<string | null>(null)
  const [locationLabel, setLocationLabel] = useState<string | null>(null)
  const [status, setStatus] = useState<'invited' | 'active' | 'suspended' | 'removed'>('active')
  const [removeOpen, setRemoveOpen] = useState(false)

  useEffect(() => {
    if (member) {
      setRoleId(member.role_id)
      setRoleLabel(member.roles?.name ?? null)
      setLocationId(member.location_id)
      setLocationLabel(member.locations?.name ?? null)
      setStatus(member.status)
    }
  }, [member])

  if (!member) return null

  const memberName = [member.profiles?.first_name, member.profiles?.last_name].filter(Boolean).join(' ') || member.profiles?.email || 'Miembro'

  function handleSave() {
    if (!member || !roleId) return
    updateMutation.mutate(
      { id: member.id, input: { role_id: roleId, location_id: locationId, status } },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <>
      <Drawer open={!!member} title={memberName} onClose={onClose}>
        <div className="flex flex-col gap-4">
          <Field label="Correo" htmlFor="member-email">
            <p id="member-email" className="text-sm text-gray-700">{member.profiles?.email ?? '—'}</p>
          </Field>
          <Field label="Rol" htmlFor="member-role">
            <RelationSelect
              value={roleId}
              displayLabel={roleLabel}
              placeholder="Selecciona un rol"
              onSearch={(query) => searchRoles(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.name })))}
              onSelect={(option) => {
                setRoleId(option?.id ?? null)
                setRoleLabel(option?.label ?? null)
              }}
            />
          </Field>
          <Field label="Sucursal" htmlFor="member-location">
            <RelationSelect
              value={locationId}
              displayLabel={locationLabel}
              placeholder="Sin asignar"
              onSearch={(query) => searchLocations(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.name })))}
              onSelect={(option) => {
                setLocationId(option?.id ?? null)
                setLocationLabel(option?.label ?? null)
              }}
            />
          </Field>
          {member.status !== 'invited' && (
            <Field label="Estado" htmlFor="member-status">
              <div id="member-status" className="flex gap-1.5">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                      status === option.value ? 'border-accent-500 bg-accent-500 text-white' : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <button type="button" onClick={() => setRemoveOpen(true)} className="text-sm font-medium text-red-600 hover:text-red-700">
              Quitar de la organización
            </button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={updateMutation.isPending}>
                Cancelar
              </Button>
              <Button onClick={handleSave} loading={updateMutation.isPending} disabled={!roleId}>
                Guardar
              </Button>
            </div>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={removeOpen}
        title="Quitar de la organización"
        description={`¿Seguro que quieres quitar a "${memberName}" de la organización? Perderá acceso de inmediato.`}
        confirmLabel="Quitar"
        danger
        loading={removeMutation.isPending}
        onConfirm={() =>
          removeMutation.mutate(member.id, {
            onSuccess: () => {
              setRemoveOpen(false)
              onClose()
            },
          })
        }
        onCancel={() => setRemoveOpen(false)}
      />
    </>
  )
}
