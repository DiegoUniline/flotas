import { useRef, useState } from 'react'
import { Paperclip, Trash2, X } from 'lucide-react'
import {
  useAttachmentsQuery,
  useDeleteAttachment,
  useUploadAttachment,
} from '@/features/attachments/hooks/useAttachments'
import { getAttachmentSignedUrl, type Attachment } from '@/features/attachments/api/attachmentsApi'
import { useToast } from '@/context/ToastContext'

interface AttachmentUploaderProps {
  entityType: string
  entityId: string
  label?: string
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentUploader({ entityType, entityId, label = 'Archivos' }: AttachmentUploaderProps) {
  const attachmentsQuery = useAttachmentsQuery(entityType, entityId)
  const uploadMutation = useUploadAttachment(entityType, entityId)
  const deleteMutation = useDeleteAttachment(entityType, entityId)
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) uploadMutation.mutate(file)
    event.target.value = ''
  }

  async function handleOpen(attachment: Attachment) {
    setOpeningId(attachment.id)
    try {
      const url = await getAttachmentSignedUrl(attachment.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      showToast('No se pudo abrir el archivo', 'error')
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:text-accent-700 disabled:opacity-50"
        >
          <Paperclip size={13} strokeWidth={2} />
          {uploadMutation.isPending ? 'Subiendo…' : 'Adjuntar archivo'}
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      {attachmentsQuery.data && attachmentsQuery.data.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {attachmentsQuery.data.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center justify-between rounded-md border border-gray-200 px-2.5 py-1.5 text-sm"
            >
              <button
                type="button"
                onClick={() => handleOpen(attachment)}
                disabled={openingId === attachment.id}
                className="truncate text-left text-gray-700 hover:text-accent-600 disabled:opacity-50"
                title={attachment.file_name}
              >
                {attachment.file_name}
                {attachment.file_size != null && (
                  <span className="ml-1.5 text-xs text-gray-400">{formatFileSize(attachment.file_size)}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(attachment)}
                className="ml-2 shrink-0 text-gray-400 hover:text-red-600"
                aria-label="Eliminar archivo"
              >
                {deleteMutation.isPending && deleteMutation.variables?.id === attachment.id ? (
                  <X size={14} strokeWidth={2} />
                ) : (
                  <Trash2 size={14} strokeWidth={2} />
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-400">Sin archivos adjuntos.</p>
      )}
    </div>
  )
}
