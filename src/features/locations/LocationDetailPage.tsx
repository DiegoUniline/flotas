import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, LocateFixed } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DetailField, DetailGrid, DetailSection } from '@/components/ui/DetailGrid'
import { InlineField } from '@/components/ui/InlineField'
import { SaveDiscardBar } from '@/components/ui/SaveDiscardBar'
import { HistoryPanel } from '@/components/audit/HistoryPanel'
import { Can } from '@/components/Can'
import { LOCATION_TYPES, type Location } from '@/features/locations/api/locationsApi'
import { useCreateLocation, useDeleteLocation, useLocation, useUpdateLocation } from '@/features/locations/hooks/useLocations'

const TYPE_OPTIONS = LOCATION_TYPES.map((t) => ({ value: t.value, label: t.label }))

interface Draft {
  code: string
  name: string
  location_type: string
  phone: string
  address_line_1: string
  address_line_2: string
  city: string
  state: string
  postal_code: string
  country: string
  latitude: string
  longitude: string
  active: boolean
}

function toDraft(location?: Location): Draft {
  return {
    code: location?.code ?? '',
    name: location?.name ?? '',
    location_type: location?.location_type ?? 'branch',
    phone: location?.phone ?? '',
    address_line_1: location?.address_line_1 ?? '',
    address_line_2: location?.address_line_2 ?? '',
    city: location?.city ?? '',
    state: location?.state ?? '',
    postal_code: location?.postal_code ?? '',
    country: location?.country ?? 'MX',
    latitude: location?.latitude != null ? String(location.latitude) : '',
    longitude: location?.longitude != null ? String(location.longitude) : '',
    active: location?.active ?? true,
  }
}

function toNullableNumber(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function LocationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'nuevo'
  const navigate = useNavigate()

  const locationQuery = useLocation(isNew ? undefined : id)
  const createMutation = useCreateLocation()
  const updateMutation = useUpdateLocation()
  const deleteMutation = useDeleteLocation()

  const [draft, setDraft] = useState<Draft>(() => toDraft())
  const [original, setOriginal] = useState<Draft>(() => toDraft())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  useEffect(() => {
    if (locationQuery.data) {
      const next = toDraft(locationQuery.data)
      setDraft(next)
      setOriginal(next)
    }
  }, [locationQuery.data])

  const dirty = JSON.stringify(draft) !== JSON.stringify(original)

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (dirty) event.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty])

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function handleBack() {
    if (dirty) {
      setLeaveConfirmOpen(true)
    } else {
      navigate('/sucursales')
    }
  }

  function handleUseCurrentLocation() {
    if (!('geolocation' in navigator)) {
      setLocationError('Tu navegador no soporta geolocalización.')
      return
    }
    setLocationError(null)
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        update('latitude', String(position.coords.latitude))
        update('longitude', String(position.coords.longitude))
        setLocating(false)
      },
      (error) => {
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? 'Permiso de ubicación denegado. Actívalo en tu navegador o teléfono.'
            : 'No se pudo obtener tu ubicación.',
        )
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function handleSave() {
    if (!draft.name.trim()) {
      setErrors({ name: 'Campo obligatorio' })
      return
    }

    const input = {
      code: draft.code || null,
      name: draft.name,
      location_type: draft.location_type,
      phone: draft.phone || null,
      address_line_1: draft.address_line_1 || null,
      address_line_2: draft.address_line_2 || null,
      city: draft.city || null,
      state: draft.state || null,
      postal_code: draft.postal_code || null,
      country: draft.country || null,
      latitude: toNullableNumber(draft.latitude),
      longitude: toNullableNumber(draft.longitude),
      active: draft.active,
    }

    if (isNew) {
      createMutation.mutate(input, {
        onSuccess: (created) => navigate(`/sucursales/${created.id}`, { replace: true }),
      })
    } else if (id) {
      updateMutation.mutate({ id, input }, { onSuccess: () => setOriginal(draft) })
    }
  }

  function handleDiscard() {
    if (isNew) {
      navigate('/sucursales')
    } else {
      setDraft(original)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending
  const location = locationQuery.data

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-surface px-4 py-3 sm:px-6">
          <button type="button" onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
            <ArrowLeft size={15} strokeWidth={2} />
            Sucursales
          </button>
          {!isNew && location && (
            <Can permission="locations.manage">
              <button type="button" onClick={() => setDeleteOpen(true)} className="text-sm font-medium text-red-600 hover:text-red-700">
                Eliminar
              </button>
            </Can>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto bg-surface lg:flex-row lg:overflow-hidden">
          <div className="flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:overflow-y-auto">
            {!isNew && locationQuery.isLoading && <Skeleton className="h-64" />}
            {!isNew && locationQuery.isError && (
              <ErrorState message="No se pudo cargar la sucursal." onRetry={() => void locationQuery.refetch()} />
            )}

            {(isNew || location) && (
              <div className="flex max-w-6xl flex-col gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-ink">{draft.name || (isNew ? 'Nueva sucursal' : 'Sucursal')}</h1>
                  <p className="text-sm text-gray-500">{draft.city || 'Sin ciudad registrada'}</p>
                </div>

                <DetailSection title="Identificación" description="Datos de registro de la sucursal.">
                  <DetailGrid>
                    <DetailField label="Nombre" required error={errors.name}>
                      <InlineField value={draft.name} onChange={(v) => update('name', v)} placeholder="Nombre de la sucursal" />
                    </DetailField>
                    <DetailField label="Código">
                      <InlineField value={draft.code} onChange={(v) => update('code', v)} placeholder="Agregar…" />
                    </DetailField>

                    <DetailField label="Tipo">
                      <InlineField type="buttons" value={draft.location_type} options={TYPE_OPTIONS} onChange={(v) => update('location_type', v)} />
                    </DetailField>
                    <DetailField label="Teléfono">
                      <InlineField value={draft.phone} onChange={(v) => update('phone', v)} />
                    </DetailField>

                    <DetailField label="Activa">
                      <InlineField type="checkbox" value={draft.active ? 'true' : 'false'} onChange={(v) => update('active', v === 'true')} />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Dirección" description="Domicilio y ubicación en el mapa.">
                  <DetailGrid>
                    <DetailField label="Dirección" full>
                      <InlineField value={draft.address_line_1} onChange={(v) => update('address_line_1', v)} />
                    </DetailField>
                    <DetailField label="Dirección (línea 2)" full>
                      <InlineField value={draft.address_line_2} onChange={(v) => update('address_line_2', v)} />
                    </DetailField>

                    <DetailField label="Ciudad">
                      <InlineField value={draft.city} onChange={(v) => update('city', v)} />
                    </DetailField>
                    <DetailField label="Estado">
                      <InlineField value={draft.state} onChange={(v) => update('state', v)} />
                    </DetailField>

                    <DetailField label="Código postal">
                      <InlineField value={draft.postal_code} onChange={(v) => update('postal_code', v)} />
                    </DetailField>
                    <DetailField label="País">
                      <InlineField value={draft.country} onChange={(v) => update('country', v)} />
                    </DetailField>

                    <DetailField label="Latitud">
                      <InlineField type="number" value={draft.latitude} onChange={(v) => update('latitude', v)} placeholder="19.4326" />
                    </DetailField>
                    <DetailField label="Longitud">
                      <InlineField type="number" value={draft.longitude} onChange={(v) => update('longitude', v)} placeholder="-99.1332" />
                    </DetailField>

                    <DetailField label="" full>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleUseCurrentLocation}
                          disabled={locating}
                          className="flex items-center gap-1.5 text-xs font-medium text-accent-600 hover:text-accent-700 disabled:opacity-50"
                        >
                          <LocateFixed size={13} strokeWidth={2} />
                          {locating ? 'Ubicando…' : 'Usar mi ubicación'}
                        </button>
                        {locationError && <p className="text-xs text-red-600">{locationError}</p>}
                      </div>
                    </DetailField>
                  </DetailGrid>
                </DetailSection>
              </div>
            )}
          </div>

          {!isNew && id && (
            <Can permission="audit.view">
              <div className="shrink-0 border-t border-gray-200 lg:w-80 lg:border-l lg:border-t-0">
                <HistoryPanel entityType="locations" entityId={id} />
              </div>
            </Can>
          )}
        </div>

        <SaveDiscardBar dirty={dirty} saving={saving} onSave={handleSave} onDiscard={handleDiscard} />
      </div>

      <ConfirmDialog
        open={leaveConfirmOpen}
        title="Cambios sin guardar"
        description="Si sales ahora perderás los cambios que no has guardado. ¿Quieres continuar?"
        confirmLabel="Salir sin guardar"
        danger
        onConfirm={() => navigate('/sucursales')}
        onCancel={() => setLeaveConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar sucursal"
        description={`¿Seguro que quieres eliminar "${draft.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => id && deleteMutation.mutate(id, { onSuccess: () => navigate('/sucursales') })}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
