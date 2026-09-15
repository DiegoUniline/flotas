import { supabase } from '@/lib/supabase'
import { VEHICLE_DOCUMENT_TYPES } from '@/features/vehicles/api/vehicleDocumentsApi'

export type DocumentSource = 'license' | 'certification' | 'vehicle_document'
export type DocumentStatus = 'expired' | 'expiring_soon' | 'valid' | 'no_expiry'

export interface UnifiedDocumentRow {
  id: string
  source: DocumentSource
  documentType: string
  ownerLabel: string
  expiresAt: string | null
  linkTo: string
  status: DocumentStatus
}

export const DOCUMENT_SOURCE_LABEL: Record<DocumentSource, string> = {
  license: 'Licencia',
  certification: 'Certificación',
  vehicle_document: 'Documento de vehículo',
}

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  expired: 'Vencido',
  expiring_soon: 'Próximo a vencer',
  valid: 'Vigente',
  no_expiry: 'Sin vencimiento',
}

const VEHICLE_DOCUMENT_TYPE_LABEL = Object.fromEntries(VEHICLE_DOCUMENT_TYPES.map((t) => [t.value, t.label]))

/** Ventana de "próximo a vencer" — mismo criterio de 30 días documentado
 * por el usuario para este módulo (distinto de los 15 días de
 * mantenimiento, cada dominio define su propio margen razonable). */
const EXPIRING_SOON_DAYS = 30

/** Reporte agregado (índice de Documentos). Trae las filas completas y
 * agrega/calcula estado en el cliente — mismo criterio ya aceptado en
 * `CostsPage`/"Agrupar por" del patrón Odoo: correcto para el volumen
 * típico de una PyME, con un tope de seguridad (`ROW_LIMIT`). */
const ROW_LIMIT = 2000

function vehicleLabel(vehicle: { economic_number: string | null; plate: string | null }): string {
  const economicNumber = vehicle.economic_number ?? 'Sin identificar'
  return vehicle.plate ? `${economicNumber} · ${vehicle.plate}` : economicNumber
}

function computeStatus(expiresAt: string | null): DocumentStatus {
  if (!expiresAt) return 'no_expiry'
  const todayIso = new Date().toISOString().slice(0, 10)
  const diffDays = Math.round(
    (new Date(`${expiresAt}T00:00:00`).getTime() - new Date(`${todayIso}T00:00:00`).getTime()) / 86400000,
  )
  if (diffDays < 0) return 'expired'
  if (diffDays <= EXPIRING_SOON_DAYS) return 'expiring_soon'
  return 'valid'
}

interface LicenseRow {
  id: string
  driver_id: string
  license_type: string | null
  expires_at: string | null
  drivers: { first_name: string; last_name: string } | null
}

interface CertificationRow {
  id: string
  driver_id: string
  certification_type: string
  expires_at: string | null
  drivers: { first_name: string; last_name: string } | null
}

interface VehicleDocRow {
  id: string
  entity_id: string
  document_type: string
  expires_at: string | null
}

/** Índice real de todos los documentos con vencimiento — une
 * `driver_licenses`, `driver_certifications` y `entity_documents`
 * (entity_type = 'vehicle') sin ninguna tabla nueva, cada fila enlaza de
 * vuelta a la ficha del operador/vehículo dueño para editar (este índice
 * es solo de lectura). Reutilizado también por el módulo Alertas — no se
 * duplica la lógica de unión/estado en dos lugares. */
export async function fetchAllDocuments(organizationId: string): Promise<UnifiedDocumentRow[]> {
  const [licensesRes, certsRes, vehicleDocsRes] = await Promise.all([
    supabase
      .from('driver_licenses')
      .select('id, driver_id, license_type, expires_at, drivers(first_name, last_name)')
      .eq('organization_id', organizationId)
      .order('expires_at', { ascending: true, nullsFirst: false })
      .limit(ROW_LIMIT),
    supabase
      .from('driver_certifications')
      .select('id, driver_id, certification_type, expires_at, drivers(first_name, last_name)')
      .eq('organization_id', organizationId)
      .order('expires_at', { ascending: true, nullsFirst: false })
      .limit(ROW_LIMIT),
    supabase
      .from('entity_documents')
      .select('id, entity_id, document_type, expires_at')
      .eq('organization_id', organizationId)
      .eq('entity_type', 'vehicle')
      .order('expires_at', { ascending: true, nullsFirst: false })
      .limit(ROW_LIMIT),
  ])

  if (licensesRes.error) throw licensesRes.error
  if (certsRes.error) throw certsRes.error
  if (vehicleDocsRes.error) throw vehicleDocsRes.error

  const licenses = (licensesRes.data ?? []) as unknown as LicenseRow[]
  const certs = (certsRes.data ?? []) as unknown as CertificationRow[]
  const vehicleDocs = (vehicleDocsRes.data ?? []) as unknown as VehicleDocRow[]

  const vehicleIds = Array.from(new Set(vehicleDocs.map((d) => d.entity_id)))
  const vehiclesById = new Map<string, { economic_number: string | null; plate: string | null }>()
  if (vehicleIds.length > 0) {
    const { data, error } = await supabase.from('vehicles').select('id, economic_number, plate').in('id', vehicleIds)
    if (error) throw error
    for (const v of data ?? []) vehiclesById.set(v.id, { economic_number: v.economic_number, plate: v.plate })
  }

  const rows: UnifiedDocumentRow[] = []

  for (const lic of licenses) {
    rows.push({
      id: lic.id,
      source: 'license',
      documentType: lic.license_type ? `Licencia (${lic.license_type})` : 'Licencia de conducir',
      ownerLabel: lic.drivers ? `${lic.drivers.first_name} ${lic.drivers.last_name}` : 'Operador',
      expiresAt: lic.expires_at,
      linkTo: `/operadores/${lic.driver_id}`,
      status: computeStatus(lic.expires_at),
    })
  }

  for (const cert of certs) {
    rows.push({
      id: cert.id,
      source: 'certification',
      documentType: cert.certification_type,
      ownerLabel: cert.drivers ? `${cert.drivers.first_name} ${cert.drivers.last_name}` : 'Operador',
      expiresAt: cert.expires_at,
      linkTo: `/operadores/${cert.driver_id}`,
      status: computeStatus(cert.expires_at),
    })
  }

  for (const doc of vehicleDocs) {
    const vehicle = vehiclesById.get(doc.entity_id)
    rows.push({
      id: doc.id,
      source: 'vehicle_document',
      documentType: VEHICLE_DOCUMENT_TYPE_LABEL[doc.document_type] ?? doc.document_type,
      ownerLabel: vehicle ? vehicleLabel(vehicle) : 'Vehículo',
      expiresAt: doc.expires_at,
      linkTo: `/vehiculos/${doc.entity_id}`,
      status: computeStatus(doc.expires_at),
    })
  }

  const statusOrder: Record<DocumentStatus, number> = { expired: 0, expiring_soon: 1, valid: 2, no_expiry: 3 }
  return rows.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || (a.expiresAt ?? '').localeCompare(b.expiresAt ?? ''))
}
