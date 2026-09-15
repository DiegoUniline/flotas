import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { OrgProvider } from '@/context/OrgContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/ui/ToastViewport'
import { PwaStatus } from '@/components/pwa/PwaStatus'
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
import { MyJobsPage } from '@/features/jobs/MyJobsPage'
import { AppTabLayout } from '@/features/app/AppTabLayout'
import { AppSyncPage } from '@/features/app/AppSyncPage'
import { AppRouteMapPage } from '@/features/app/AppRouteMapPage'
import { DevicesPage } from '@/features/devices/DevicesPage'
import { DeviceDetailPage } from '@/features/devices/DeviceDetailPage'
import { GeofencesPage } from '@/features/geofences/GeofencesPage'
import { GeofenceDetailPage } from '@/features/geofences/GeofenceDetailPage'
import { FuelLogsPage } from '@/features/fuel/FuelLogsPage'
import { FuelLogDetailPage } from '@/features/fuel/FuelLogDetailPage'
import { ExpensesPage } from '@/features/expenses/ExpensesPage'
import { ExpenseDetailPage } from '@/features/expenses/ExpenseDetailPage'
import { CostsPage } from '@/features/costs/CostsPage'
import { MaintenanceRecordsPage } from '@/features/maintenance/MaintenanceRecordsPage'
import { MaintenanceRecordDetailPage } from '@/features/maintenance/MaintenanceRecordDetailPage'
import { MaintenanceTypesPage } from '@/features/maintenance/MaintenanceTypesPage'
import { MaintenanceTypeDetailPage } from '@/features/maintenance/MaintenanceTypeDetailPage'
import { PartsPage } from '@/features/parts/PartsPage'
import { PartDetailPage } from '@/features/parts/PartDetailPage'
import { InspectionsPage } from '@/features/inspections/InspectionsPage'
import { InspectionDetailPage } from '@/features/inspections/InspectionDetailPage'
import { InspectionTemplatesPage } from '@/features/inspections/InspectionTemplatesPage'
import { InspectionTemplateDetailPage } from '@/features/inspections/InspectionTemplateDetailPage'
import { UsersPage } from '@/features/users/UsersPage'
import { RolesPage } from '@/features/roles/RolesPage'
import { RoleDetailPage } from '@/features/roles/RoleDetailPage'
import { CompanyPage } from '@/features/company/CompanyPage'
import { InviteAcceptPage } from '@/features/invite/InviteAcceptPage'
import { HomePage } from '@/features/home/HomePage'
import { IncidentsPage } from '@/features/incidents/IncidentsPage'
import { IncidentDetailPage } from '@/features/incidents/IncidentDetailPage'
import { AlertsPage } from '@/features/alerts/AlertsPage'
import { DocumentsPage } from '@/features/documents/DocumentsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { IndicatorsPage } from '@/features/indicators/IndicatorsPage'

const comingSoonItems = NAV_SECTIONS.flatMap((section) => section.items).filter((item) => !item.implemented)

export function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/recuperar-password" element={<ForgotPasswordPage />} />
            <Route path="/restablecer-password" element={<ResetPasswordPage />} />
            <Route path="/invitacion/:token" element={<InviteAcceptPage />} />
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
              <Route path="mi-ubicacion" element={<Navigate to="/app/ubicacion" replace />} />
              <Route path="mis-pedidos" element={<Navigate to="/app/pedidos" replace />} />
              <Route path="app" element={<AppTabLayout />}>
                <Route index element={<Navigate to="pedidos" replace />} />
                <Route path="pedidos" element={<MyJobsPage />} />
                <Route path="mapa" element={<AppRouteMapPage />} />
                <Route path="ubicacion" element={<MiUbicacionPage />} />
                <Route path="sincronizar" element={<AppSyncPage />} />
              </Route>
              <Route path="dispositivos" element={<DevicesPage />} />
              <Route path="dispositivos/:id" element={<DeviceDetailPage />} />
              <Route path="geocercas" element={<GeofencesPage />} />
              <Route path="geocercas/:id" element={<GeofenceDetailPage />} />
              <Route path="combustible" element={<FuelLogsPage />} />
              <Route path="combustible/:id" element={<FuelLogDetailPage />} />
              <Route path="gastos" element={<ExpensesPage />} />
              <Route path="gastos/:id" element={<ExpenseDetailPage />} />
              <Route path="costos" element={<CostsPage />} />
              <Route path="mantenimientos/tipos" element={<MaintenanceTypesPage />} />
              <Route path="mantenimientos/tipos/:id" element={<MaintenanceTypeDetailPage />} />
              <Route path="mantenimientos" element={<MaintenanceRecordsPage />} />
              <Route path="mantenimientos/:id" element={<MaintenanceRecordDetailPage />} />
              <Route path="refacciones" element={<PartsPage />} />
              <Route path="refacciones/:id" element={<PartDetailPage />} />
              <Route path="inspecciones/plantillas" element={<InspectionTemplatesPage />} />
              <Route path="inspecciones/plantillas/:id" element={<InspectionTemplateDetailPage />} />
              <Route path="inspecciones" element={<InspectionsPage />} />
              <Route path="inspecciones/:id" element={<InspectionDetailPage />} />
              <Route path="usuarios" element={<UsersPage />} />
              <Route path="roles" element={<RolesPage />} />
              <Route path="roles/:id" element={<RoleDetailPage />} />
              <Route path="empresa" element={<CompanyPage />} />
              <Route path="inicio" element={<HomePage />} />
              <Route path="incidentes" element={<IncidentsPage />} />
              <Route path="incidentes/:id" element={<IncidentDetailPage />} />
              <Route path="alertas" element={<AlertsPage />} />
              <Route path="documentos" element={<DocumentsPage />} />
              <Route path="reportes" element={<ReportsPage />} />
              <Route path="indicadores" element={<IndicatorsPage />} />
              {comingSoonItems.map((item) => (
                <Route key={item.to} path={item.to.slice(1)} element={<ComingSoonPage title={item.label} />} />
              ))}
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastViewport />
          <PwaStatus />
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}
