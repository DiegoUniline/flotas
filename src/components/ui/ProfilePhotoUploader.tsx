import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { getInitials } from '@/lib/format'
import { useToast } from '@/context/ToastContext'
import { uploadProfilePhoto } from '@/features/attachments/api/profilePhotoApi'

interface ProfilePhotoUploaderProps {
  organizationId: string
  entityType: string
  entityId: string
  photoUrl: string | null
  /** Para las iniciales de respaldo cuando no hay foto. */
  name: string
  onUploaded: (url: string) => void
  size?: number
}

/** Avatar circular con botón de cámara superpuesto — foto real si existe
 * (`entity.photo_url`), iniciales sobre fondo de color si no. Sube de
 * inmediato al elegir el archivo (no pasa por el draft/Guardar genérico
 * de la ficha, mismo criterio que el resto de attachments del proyecto:
 * es una acción propia, no un campo más del formulario) y llama
 * `onUploaded(url)` para que la pantalla que lo usa actualice el registro
 * real con la URL nueva. */
export function ProfilePhotoUploader({ organizationId, entityType, entityId, photoUrl, name, onUploaded, size = 96 }: ProfilePhotoUploaderProps) {
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploading(true)
    try {
      const url = await uploadProfilePhoto(organizationId, entityType, entityId, file, photoUrl)
      onUploaded(url)
      showToast('Foto de perfil actualizada', 'success')
    } catch {
      showToast('No se pudo subir la foto', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {photoUrl ? (
        <img src={photoUrl} alt={name} className="h-full w-full rounded-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full bg-accent-100 font-semibold text-accent-600"
          style={{ fontSize: size / 3 }}
        >
          {getInitials(name) || '—'}
        </div>
      )}

      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      )}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        title={photoUrl ? 'Cambiar foto' : 'Agregar foto'}
        className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-accent-500 text-white shadow-sm hover:bg-accent-600 disabled:opacity-50"
      >
        <Camera size={13} strokeWidth={2} />
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </div>
  )
}
