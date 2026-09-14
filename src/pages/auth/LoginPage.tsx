import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { signInWithPassword } from '@/features/auth/api/authApi'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signInWithPassword(email, password)
      const redirectTo = (location.state as { from?: string })?.from ?? '/'
      navigate(redirectTo, { replace: true })
    } catch {
      setError('Correo o contraseña incorrectos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Inicia sesión en tu cuenta">
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
        <Field label="Contraseña" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Iniciar sesión
        </Button>
        <div className="flex items-center justify-between text-sm">
          <Link to="/recuperar-password" className="text-gray-600 hover:underline">
            Olvidé mi contraseña
          </Link>
          <Link to="/registro" className="text-gray-600 hover:underline">
            Crear cuenta
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
