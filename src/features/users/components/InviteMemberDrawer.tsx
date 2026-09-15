import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { RelationSelect } from '@/components/ui/RelationSelect'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import { searchRoles } from '@/features/roles/api/rolesApi'
import { searchLocations } from '@/features/locations/api/locationsApi'
import { buildInviteLink, type OrganizationInvite } from '@/features/users/api/organizationInvitesApi'
import { useCreateOrganizationInvite } from '@/features/users/hooks/useOrganizationInvites'

interface InviteMemberDrawerProps {
  open: boolean
  onClose: () => void
}

export function InviteMemberDrawer({ open, onClose }: InviteMemberDrawerProps) {
  const { activeOrg } = useOrg()
  const { showToast } = useToast()
  const createMutation = useCreateOrganizationInvite()

  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState<string | null>(null)
  const [roleLabel, setRoleLabel] = useState<string | null>(null)
  const [locationId, setLocationId] = useState<string | null>(null)
  const [locationLabel, setLocationLabel] = useState<string | null>(null)
  const [created, setCreated] = useState<OrganizationInvite | null>(null)
  const [copied, setCopied] = useState(false)

  function reset() {
    setEmail('')
    setRoleId(null)
    setRoleLabel(null)
    setLocationId(null)
    setLocationLabel(null)
    setCreated(null)
    setCopied(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit() {
    if (!email.trim() || !roleId) return
    createMutation.mutate(
      { email: email.trim().toLowerCase(), role_id: roleId, location_id: locationId },
      { onSuccess: (invite) => setCreated(invite) },
    )
  }

  async function handleCopy() {
    if (!created) return
    await navigator.clipboard.writeText(buildInviteLink(created.token))
    setCopied(true)
    showToast('Enlace copiado', 'success')
  }

  return (
    <Drawer open={open} title="Invitar usuario" onClose={handleClose}>
      {created ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-700">
            Invitación creada para <span className="font-medium">{created.email}</span>. Como todavía no enviamos correos
            automáticos, comparte este enlace con la persona (WhatsApp, correo, etc.) para que se una:
          </p>
          <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-700">
            <span className="flex-1 truncate">{buildInviteLink(created.token)}</span>
            <button type="button" onClick={handleCopy} className="shrink-0 text-accent-600 hover:text-accent-700">
              {copied ? <Check size={15} strokeWidth={2} /> : <Copy size={15} strokeWidth={2} />}
            </button>
          </div>
          <p className="text-xs text-gray-400">El enlace expira en 7 días.</p>
          <div className="flex justify-end">
            <Button onClick={handleClose}>Listo</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Field label="Correo electrónico" htmlFor="invite-email">
            <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Rol" htmlFor="invite-role">
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
          <Field label="Sucursal (opcional)" htmlFor="invite-location">
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
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={createMutation.isPending} disabled={!email.trim() || !roleId}>
              Crear invitación
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  )
}
