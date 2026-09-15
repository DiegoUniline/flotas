import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageScroll } from '@/components/ui/PageScroll'
import { DetailField, DetailGrid, DetailSection } from '@/components/ui/DetailGrid'
import { InlineField } from '@/components/ui/InlineField'
import { SaveDiscardBar } from '@/components/ui/SaveDiscardBar'
import { useOrg } from '@/context/OrgContext'
import type { CompanyOrganization } from '@/features/company/api/companyApi'
import { useCompanyQuery, useUpdateCompany } from '@/features/company/hooks/useCompany'

const ORG_STATUS_LABEL: Record<string, string> = { trial: 'Prueba', active: 'Activa', suspended: 'Suspendida', cancelled: 'Cancelada' }

interface Draft {
  name: string
  legal_name: string
  tax_id: string
  phone: string
  email: string
  website: string
  currency: string
  timezone: string
  locale: string
  country_code: string
}

function toDraft(org?: CompanyOrganization): Draft {
  return {
    name: org?.name ?? '',
    legal_name: org?.legal_name ?? '',
    tax_id: org?.tax_id ?? '',
    phone: org?.phone ?? '',
    email: org?.email ?? '',
    website: org?.website ?? '',
    currency: org?.currency ?? 'MXN',
    timezone: org?.timezone ?? 'America/Mexico_City',
    locale: org?.locale ?? 'es-MX',
    country_code: org?.country_code ?? 'MX',
  }
}

export function CompanyPage() {
  const { activeOrg } = useOrg()
  const companyQuery = useCompanyQuery(activeOrg?.id)
  const updateMutation = useUpdateCompany(activeOrg?.id)

  const [draft, setDraft] = useState<Draft>(() => toDraft())
  const [original, setOriginal] = useState<Draft>(() => toDraft())
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (companyQuery.data) {
      const next = toDraft(companyQuery.data)
      setDraft(next)
      setOriginal(next)
    }
  }, [companyQuery.data])

  const dirty = JSON.stringify(draft) !== JSON.stringify(original)

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function handleSave() {
    if (!draft.name.trim()) {
      setErrors({ name: 'Campo obligatorio' })
      return
    }
    updateMutation.mutate(
      {
        name: draft.name,
        legal_name: draft.legal_name || null,
        tax_id: draft.tax_id || null,
        phone: draft.phone || null,
        email: draft.email || null,
        website: draft.website || null,
        currency: draft.currency,
        timezone: draft.timezone,
        locale: draft.locale,
        country_code: draft.country_code,
      },
      { onSuccess: () => setOriginal(draft) },
    )
  }

  const org = companyQuery.data

  return (
    <PageScroll>
      <div className="flex flex-col gap-4 p-4 pb-20">
        <div>
          <h1 className="text-xl font-semibold text-ink">Empresa</h1>
          <p className="text-sm text-gray-500">Datos generales de tu organización.</p>
        </div>

        {companyQuery.isLoading && <Skeleton className="h-64" />}
        {companyQuery.isError && <ErrorState message="No se pudo cargar la empresa." onRetry={() => void companyQuery.refetch()} />}

        {org && (
          <div className="flex max-w-3xl flex-col gap-4">
            <DetailSection title="Identificación" description="Nombre, razón social y datos fiscales.">
              <DetailGrid>
                <DetailField label="Nombre" required error={errors.name}>
                  <InlineField value={draft.name} onChange={(v) => update('name', v)} />
                </DetailField>
                <DetailField label="Razón social">
                  <InlineField value={draft.legal_name} onChange={(v) => update('legal_name', v)} placeholder="Agregar…" />
                </DetailField>

                <DetailField label="RFC / Tax ID">
                  <InlineField value={draft.tax_id} onChange={(v) => update('tax_id', v)} placeholder="Agregar…" />
                </DetailField>
                <DetailField label="Identificador (slug)">
                  <InlineField value={org.slug} onChange={() => {}} readOnly />
                </DetailField>

                <DetailField label="Estado de la cuenta">
                  <InlineField value={ORG_STATUS_LABEL[org.status] ?? org.status} onChange={() => {}} readOnly />
                </DetailField>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="Contacto" description="Teléfono, correo y sitio web de la empresa.">
              <DetailGrid>
                <DetailField label="Teléfono">
                  <InlineField value={draft.phone} onChange={(v) => update('phone', v)} placeholder="Agregar…" />
                </DetailField>
                <DetailField label="Correo">
                  <InlineField value={draft.email} onChange={(v) => update('email', v)} placeholder="Agregar…" />
                </DetailField>
                <DetailField label="Sitio web">
                  <InlineField value={draft.website} onChange={(v) => update('website', v)} placeholder="Agregar…" />
                </DetailField>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="Regional" description="Moneda, zona horaria e idioma que usa la organización.">
              <DetailGrid>
                <DetailField label="Moneda">
                  <InlineField value={draft.currency} onChange={(v) => update('currency', v.toUpperCase().slice(0, 3))} />
                </DetailField>
                <DetailField label="País">
                  <InlineField value={draft.country_code} onChange={(v) => update('country_code', v.toUpperCase().slice(0, 2))} />
                </DetailField>

                <DetailField label="Zona horaria">
                  <InlineField value={draft.timezone} onChange={(v) => update('timezone', v)} />
                </DetailField>
                <DetailField label="Idioma">
                  <InlineField value={draft.locale} onChange={(v) => update('locale', v)} />
                </DetailField>
              </DetailGrid>
            </DetailSection>
          </div>
        )}
      </div>

      <SaveDiscardBar dirty={dirty} saving={updateMutation.isPending} onSave={handleSave} onDiscard={() => setDraft(original)} />
    </PageScroll>
  )
}
