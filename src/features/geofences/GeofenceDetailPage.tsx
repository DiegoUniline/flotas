import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DetailField, DetailGrid, DetailSection } from '@/components/ui/DetailGrid'
import { InlineField } from '@/components/ui/InlineField'
import { RelationSelect } from '@/components/ui/RelationSelect'
import { SaveDiscardBar } from '@/components/ui/SaveDiscardBar'
import { HistoryPanel } from '@/components/audit/HistoryPanel'
import { Can } from '@/components/Can'
import { useOrg } from '@/context/OrgContext'
import { searchLocations } from '@/features/locations/api/locationsApi'
import { GEOFENCE_COLORS, type GeofenceWithRelations } from '@/features/geofences/api/geofencesApi'
import { useCreateGeofence, useDeleteGeofence, useGeofence, useUpdateGeofence } from '@/features/geofences/hooks/useGeofences'
import { GeofenceMapField } from './components/GeofenceMapField'

const COLOR_OPTIONS = GEOFENCE_COLORS.map((c) => ({ value: c.value, label: c.label }))

interface Draft {
  name: string
  description: string
  color: string
  radius_meters: string
  center_latitude: string
  center_longitude: string
  location_id: string
  location_label: string
  active: boolean
}

function toDraft(geofence?: GeofenceWithRelations): Draft {
  return {
    name: geofence?.name ?? '',
    description: geofence?.description ?? '',
    color: geofence?.color ?? GEOFENCE_COLORS[0].value,
    radius_meters: geofence ? String(geofence.radius_meters) : '500',
    center_latitude: geofence?.center_latitude != null ? String(geofence.center_latitude) : '',
    center_longitude: geofence?.center_longitude != null ? String(geofence.center_longitude) : '',
    location_id: geofence?.location_id ?? '',
    location_label: geofence?.locations?.name ?? '',
    active: geofence?.active ?? true,
  }
}

export function GeofenceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'nuevo'
  const navigate = useNavigate()
  const { activeOrg } = useOrg()

  const geofenceQuery = useGeofence(isNew ? undefined : id)
  const createMutation = useCreateGeofence()
  const updateMutation = useUpdateGeofence()
  const deleteMutation = useDeleteGeofence()

  const [draft, setDraft] = useState<Draft>(() => toDraft())
  const [original, setOriginal] = useState<Draft>(() => toDraft())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (geofenceQuery.data) {
      const next = toDraft(geofenceQuery.data)
      setDraft(next)
      setOriginal(next)
    }
  }, [geofenceQuery.data])

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
      navigate('/geocercas')
    }
  }

  function handleSave() {
    const nextErrors: Record<string, string> = {}
    if (!draft.name.trim()) nextErrors.name = 'Campo obligatorio'
    if (draft.center_latitude.trim() === '' || draft.center_longitude.trim() === '') {
      nextErrors.center = 'Define el centro de la zona en el mapa'
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const input = {
      name: draft.name,
      description: draft.description || null,
      color: draft.color,
      radius_meters: Number(draft.radius_meters) || 500,
      center_latitude: Number(draft.center_latitude),
      center_longitude: Number(draft.center_longitude),
      location_id: draft.location_id || null,
      active: draft.active,
    }

    if (isNew) {
      createMutation.mutate(input, {
        onSuccess: (created) => navigate(`/geocercas/${created.id}`, { replace: true }),
      })
    } else if (id) {
      updateMutation.mutate({ id, input }, { onSuccess: () => setOriginal(draft) })
    }
  }

  function handleDiscard() {
    if (isNew) {
      navigate('/geocercas')
    } else {
      setDraft(original)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending
  const geofence = geofenceQuery.data

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <button type="button" onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink">
            <ArrowLeft size={15} strokeWidth={2} />
            Geocercas
          </button>
          {!isNew && geofence && (
            <Can permission="geofences.manage">
              <button type="button" onClick={() => setDeleteOpen(true)} className="text-sm font-medium text-red-600 hover:text-red-700">
                Eliminar
              </button>
            </Can>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto bg-white lg:flex-row lg:overflow-hidden">
          <div className="flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:overflow-y-auto">
            {!isNew && geofenceQuery.isLoading && <Skeleton className="h-64" />}
            {!isNew && geofenceQuery.isError && (
              <ErrorState message="No se pudo cargar la geocerca." onRetry={() => void geofenceQuery.refetch()} />
            )}

            {(isNew || geofence) && (
              <div className="flex max-w-4xl flex-col gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-ink">{draft.name || (isNew ? 'Nueva geocerca' : 'Geocerca')}</h1>
                  <p className="text-sm text-gray-500">{draft.radius_meters ? `Radio de ${draft.radius_meters} m` : 'Sin radio definido'}</p>
                </div>

                <DetailSection title="Identificación" description="Nombre, color y sucursal de referencia.">
                  <DetailGrid>
                    <DetailField label="Nombre" required error={errors.name}>
                      <InlineField value={draft.name} onChange={(v) => update('name', v)} placeholder="Nombre de la zona" />
                    </DetailField>
                    <DetailField label="Color">
                      <InlineField type="buttons" value={draft.color} options={COLOR_OPTIONS} onChange={(v) => update('color', v)} />
                    </DetailField>

                    <DetailField label="Sucursal relacionada">
                      <RelationSelect
                        value={draft.location_id || null}
                        displayLabel={draft.location_label || null}
                        placeholder="Sin relacionar"
                        onSearch={(query) =>
                          searchLocations(activeOrg!.id, query).then((rows) => rows.map((r) => ({ id: r.id, label: r.name })))
                        }
                        onSelect={(option) => {
                          update('location_id', option?.id ?? '')
                          update('location_label', option?.label ?? '')
                        }}
                      />
                    </DetailField>
                    <DetailField label="Activa">
                      <InlineField type="checkbox" value={draft.active ? 'true' : 'false'} onChange={(v) => update('active', v === 'true')} />
                    </DetailField>

                    <DetailField label="Descripción" full>
                      <InlineField type="textarea" value={draft.description} onChange={(v) => update('description', v)} />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Zona" description="Centro y radio de la geocerca (solo círculos por ahora).">
                  <DetailGrid>
                    <DetailField label="Radio (m)">
                      <InlineField type="number" value={draft.radius_meters} onChange={(v) => update('radius_meters', v)} />
                    </DetailField>

                    <DetailField label="Centro" full error={errors.center}>
                      <GeofenceMapField
                        latitude={draft.center_latitude ? Number(draft.center_latitude) : null}
                        longitude={draft.center_longitude ? Number(draft.center_longitude) : null}
                        radiusMeters={Number(draft.radius_meters) || 500}
                        color={draft.color}
                        onChangeCenter={(lat, lng) => {
                          update('center_latitude', String(lat))
                          update('center_longitude', String(lng))
                        }}
                      />
                    </DetailField>
                  </DetailGrid>
                </DetailSection>
              </div>
            )}
          </div>

          {!isNew && id && (
            <Can permission="audit.view">
              <div className="shrink-0 border-t border-gray-200 lg:w-80 lg:border-l lg:border-t-0">
                <HistoryPanel entityType="geofences" entityId={id} />
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
        onConfirm={() => navigate('/geocercas')}
        onCancel={() => setLeaveConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar geocerca"
        description={`¿Seguro que quieres eliminar "${draft.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => id && deleteMutation.mutate(id, { onSuccess: () => navigate('/geocercas') })}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
