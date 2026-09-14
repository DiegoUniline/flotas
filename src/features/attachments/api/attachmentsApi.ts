import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type Attachment = Tables<'attachments'>

const BUCKET = 'attachments'

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
}

export async function fetchAttachments(entityType: string, entityId: string): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function uploadAttachment(
  organizationId: string,
  entityType: string,
  entityId: string,
  file: File,
): Promise<Attachment> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const storagePath = `${organizationId}/${entityType}/${entityId}/${Date.now()}-${sanitizeFileName(file.name)}`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file)
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      organization_id: organizationId,
      entity_type: entityType,
      entity_id: entityId,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      file_size: file.size,
      uploaded_by: user?.id ?? null,
    })
    .select()
    .single()

  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath])
    throw error
  }

  return data
}

export async function deleteAttachment(attachment: Attachment): Promise<void> {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([attachment.storage_path])
  if (storageError) throw storageError

  const { error } = await supabase.from('attachments').delete().eq('id', attachment.id)
  if (error) throw error
}

export async function getAttachmentSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60)
  if (error) throw error
  return data.signedUrl
}
