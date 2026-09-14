import { useState, type FormEvent } from 'react'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useOrg } from '@/context/OrgContext'
import { createOrganization } from '@/features/organizations/api/organizationsApi'

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function OnboardingWizard() {
  const { refetch } = useOrg()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleNameChange(value: string) {
    setName(value)
    if (!slugEdited) setSlug(slugify(value))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await createOrganization({
        name,
        slug,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City',
        currency: 'MXN',
        country: 'MX',
      })
      await refetch()
    } catch {
      setError('No se pudo crear la empresa. Verifica que el identificador no esté en uso.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Crea tu empresa</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configura la organización que usarás para gestionar tu flota en FLOTAA.
        </p>
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <Field label="Nombre de la empresa" htmlFor="orgName">
            <Input
              id="orgName"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </Field>
          <Field label="Identificador (slug)" htmlFor="orgSlug">
            <Input
              id="orgSlug"
              required
              pattern="[a-z0-9-]+"
              value={slug}
              onChange={(e) => {
                setSlugEdited(true)
                setSlug(slugify(e.target.value))
              }}
            />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            Crear empresa
          </Button>
        </form>
      </div>
    </div>
  )
}
