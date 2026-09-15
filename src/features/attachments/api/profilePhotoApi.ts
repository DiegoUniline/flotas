import { supabase } from '@/lib/supabase'

const BUCKET = 'avatars'

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
}

function pathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const index = url.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(url.slice(index + marker.length))
}

/** Sube una foto de perfil al bucket público `avatars`
 * (`<organization_id>/<entity_type>/<entity_id>/<timestamp>-archivo`,
 * misma convención de path que el bucket privado `attachments`) y regresa
 * la URL pública real, lista para usarse directo en `<img src>` sin
 * firmar — a diferencia de `attachments`, este bucket es público a
 * propósito porque las fotos de perfil se muestran en el mapa/paneles sin
 * pedir una URL firmada cada vez. Si había una foto anterior, se borra del
 * storage para no dejar archivos huérfanos acumulándose. */
export async function uploadProfilePhoto(
  organizationId: string,
  entityType: string,
  entityId: string,
  file: File,
  previousUrl?: string | null,
): Promise<string> {
  const storagePath = `${organizationId}/${entityType}/${entityId}/${Date.now()}-${sanitizeFileName(file.name)}`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file)
  if (uploadError) throw uploadError

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

  if (previousUrl) {
    const previousPath = pathFromPublicUrl(previousUrl)
    if (previousPath) await supabase.storage.from(BUCKET).remove([previousPath])
  }

  return publicUrl
}
