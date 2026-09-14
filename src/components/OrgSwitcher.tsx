import { useOrg } from '@/context/OrgContext'

export function OrgSwitcher() {
  const { organizations, activeOrg, switchOrganization } = useOrg()

  if (organizations.length <= 1) {
    return <span className="text-sm font-medium text-gray-900">{activeOrg?.name}</span>
  }

  return (
    <select
      value={activeOrg?.id ?? ''}
      onChange={(e) => void switchOrganization(e.target.value)}
      className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-500"
      aria-label="Cambiar de empresa"
    >
      {organizations.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </select>
  )
}
