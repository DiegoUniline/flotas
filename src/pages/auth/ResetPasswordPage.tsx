import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { updatePassword } from '@/features/auth/api/authApi'
import { useToast } from '@/context/ToastContext'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    try {
      await updatePassword(password)
      showToast('Contraseña actualizada', 'success')
      navigate('/', { replace: true })
    } catch {
      setError('No se pudo actualizar la contraseña. Solicita un nuevo enlace.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Establece tu nueva contraseña">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Nueva contraseña" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Confirma la contraseña" htmlFor="confirmPassword">
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Guardar contraseña
        </Button>
      </form>
    </AuthLayout>
  )
}
