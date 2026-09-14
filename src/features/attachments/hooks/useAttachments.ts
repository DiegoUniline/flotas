import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  deleteAttachment,
  fetchAttachments,
  uploadAttachment,
  type Attachment,
} from '@/features/attachments/api/attachmentsApi'

export function useAttachmentsQuery(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: ['attachments', entityType, entityId],
    queryFn: () => fetchAttachments(entityType, entityId!),
    enabled: !!entityId,
  })
}

export function useUploadAttachment(entityType: string, entityId: string) {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (file: File) => uploadAttachment(activeOrg!.id, entityType, entityId, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['attachments', entityType, entityId] })
      showToast('Archivo subido', 'success')
    },
    onError: () => showToast('No se pudo subir el archivo', 'error'),
  })
}

export function useDeleteAttachment(entityType: string, entityId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (attachment: Attachment) => deleteAttachment(attachment),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['attachments', entityType, entityId] })
      showToast('Archivo eliminado', 'success')
    },
    onError: () => showToast('No se pudo eliminar el archivo', 'error'),
  })
}
