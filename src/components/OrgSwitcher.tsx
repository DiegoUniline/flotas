import { useOrg } from '@/context/OrgContext'

export function OrgSwitcher() {
  const { organizations, activeOrg, switchOrganization } = useOrg()

  if (organizations.length <= 1) {
    return <span className="block truncate text-sm font-medium text-gray-900">{activeOrg?.name}</span>
  }

  return (
    <select
      value={activeOrg?.id ?? ''}
      onChange={(e) => void switchOrganization(e.target.value)}
      className="max-w-[160px] rounded-md border border-gray-300 bg-surface px-2.5 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-500 sm:max-w-none"
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
