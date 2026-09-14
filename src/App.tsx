import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { OrgProvider } from '@/context/OrgContext'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/ui/ToastViewport'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { AppShell } from '@/layout/AppShell'
import { NAV_SECTIONS } from '@/layout/navConfig'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { LocationsPage } from '@/features/locations/LocationsPage'
import { LocationDetailPage } from '@/features/locations/LocationDetailPage'
import { ControlMapPage } from '@/features/map/ControlMapPage'
import { VehiclesPage } from '@/features/vehicles/VehiclesPage'
import { VehicleDetailPage } from '@/features/vehicles/VehicleDetailPage'
import { DriversPage } from '@/features/drivers/DriversPage'
import { DriverDetailPage } from '@/features/drivers/DriverDetailPage'
import { CustomersPage } from '@/features/customers/CustomersPage'
import { CustomerDetailPage } from '@/features/customers/CustomerDetailPage'
import { JobsPage } from '@/features/jobs/JobsPage'
import { JobDetailPage } from '@/features/jobs/JobDetailPage'
import { RoutesPage } from '@/features/routes/RoutesPage'
import { RouteDetailPage } from '@/features/routes/RouteDetailPage'
import { MiUbicacionPage } from '@/features/tracking/MiUbicacionPage'

const comingSoonItems = NAV_SECTIONS.flatMap((section) => section.items).filter((item) => !item.implemented)

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
            <Route index element={<Navigate to="/centro-de-control" replace />} />
            <Route path="centro-de-control" element={<ControlMapPage />} />
            <Route path="sucursales" element={<LocationsPage />} />
            <Route path="sucursales/:id" element={<LocationDetailPage />} />
            <Route path="vehiculos" element={<VehiclesPage />} />
            <Route path="vehiculos/:id" element={<VehicleDetailPage />} />
            <Route path="operadores" element={<DriversPage />} />
            <Route path="operadores/:id" element={<DriverDetailPage />} />
            <Route path="clientes" element={<CustomersPage />} />
            <Route path="clientes/:id" element={<CustomerDetailPage />} />
            <Route path="pedidos" element={<JobsPage />} />
            <Route path="pedidos/:id" element={<JobDetailPage />} />
            <Route path="rutas" element={<RoutesPage />} />
            <Route path="rutas/:id" element={<RouteDetailPage />} />
            <Route path="mi-ubicacion" element={<MiUbicacionPage />} />
            {comingSoonItems.map((item) => (
              <Route key={item.to} path={item.to.slice(1)} element={<ComingSoonPage title={item.label} />} />
            ))}
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastViewport />
      </ToastProvider>
    </AuthProvider>
  )
}
