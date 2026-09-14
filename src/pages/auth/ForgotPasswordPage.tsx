import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { requestPasswordReset } from '@/features/auth/api/authApi'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch {
      setError('No se pudo enviar el correo de recuperación.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Revisa tu correo">
        <p className="text-sm text-gray-600">
          Si <span className="font-medium">{email}</span> tiene una cuenta, te enviamos un enlace
          para restablecer tu contraseña.
        </p>
        <Link to="/login" className="mt-4 inline-block text-sm text-gray-900 hover:underline">
          Volver a iniciar sesión
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Recupera tu contraseña">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Correo electrónico" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Enviar enlace de recuperación
        </Button>
        <Link to="/login" className="text-center text-sm text-gray-600 hover:underline">
          Volver a iniciar sesión
        </Link>
      </form>
    </AuthLayout>
  )
}
