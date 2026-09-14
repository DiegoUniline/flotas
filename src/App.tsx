import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { OrgProvider } from '@/context/OrgContext'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/ui/ToastViewport'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { AppShell } from '@/layout/AppShell'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { LocationsPage } from '@/features/locations/LocationsPage'

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/recuperar-password" element={<ForgotPasswordPage />} />
          <Route path="/restablecer-password" element={<ResetPasswordPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <OrgProvider>
                  <AppShell />
                </OrgProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/sucursales" replace />} />
            <Route path="sucursales" element={<LocationsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastViewport />
      </ToastProvider>
    </AuthProvider>
  )
}
