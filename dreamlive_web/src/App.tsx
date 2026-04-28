/**
 * App.tsx – Router principal con guards de roles y panel unificado multinivel.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, NotificationProvider, ThemeProvider, SocketProvider } from './contexts';
import { ProtectedRoute, PublicOnlyRoute } from './infrastructure/guards/ProtectedRoute';
import {
  LoginPage, RegisterPage,
  RecoverPasswordPage, ResetPasswordPage
} from './presentation/auth/AuthPages';
import { ProfilePage } from './presentation/shared/ProfilePage';
import { NotFoundPage } from './presentation/shared/ErrorPages';

// Dashboard Core
import { DashboardLayout } from './presentation/dashboard/components/DashboardLayout';

// Views – Admin
import { AdminOverviewView } from './presentation/dashboard/views/AdminOverviewView';
import { LicensesView } from './presentation/dashboard/views/LicensesView';
import { AgenciesView } from './presentation/dashboard/views/AgenciesView';
import { UpdatesView } from './presentation/dashboard/views/UpdatesView';

// Views – Agency
import { AgencyDashboardView } from './presentation/dashboard/views/AgencyDashboardView';
import { GlobalLeadsView } from './presentation/dashboard/views/GlobalLeadsView';
import { TeamManagerView } from './presentation/dashboard/views/TeamManagerView';
import { UnderConstructionView } from './presentation/dashboard/components/UnderConstructionView';

// Views – Settings (todos los roles con variaciones)
import { ProfilesView } from './presentation/dashboard/views/ProfilesView';
import { AccountView } from './presentation/dashboard/views/AccountView';
import { TicketView } from './presentation/dashboard/views/TicketView';
import { TicketSupportView } from './presentation/dashboard/views/TicketSupportView';
import { AuditView } from './presentation/dashboard/views/AuditView';
import { RolesView } from './presentation/dashboard/views/RolesView';

function RoleRedirect() {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Dependiendo del rol inicial, lanzamos al lugar correcto
  if (role === 'superuser') return <Navigate to="/dashboard/admin/overview" replace />;
  if (role === 'agency_admin') return <Navigate to="/dashboard/agency/overview" replace />;

  // Failsafe genérico al dash de agencia (luego se pueden meter mas roles)
  return <Navigate to="/dashboard/agency/overview" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Publicas */}
      <Route path="/login" element={
        <PublicOnlyRoute><LoginPage /></PublicOnlyRoute>
      } />
      <Route path="/register" element={
        <PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>
      } />
      <Route path="/recover" element={
        <PublicOnlyRoute><RecoverPasswordPage /></PublicOnlyRoute>
      } />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Perfil – cualquier usuario autenticado */}
      <Route path="/profile" element={
        <ProtectedRoute><ProfilePage /></ProtectedRoute>
      } />

      {/* Dashboard Unificado (Protegido genéricamente) */}
      <Route path="/dashboard" element={
        <ProtectedRoute><DashboardLayout /></ProtectedRoute>
      }>

        {/* Redireccion de base */}
        <Route index element={<RoleRedirect />} />

        {/* ── SECCION ADMINISTRADOR ── */}
        {/* Solo accesibles si roles incluye 'superuser' */}
        <Route path="admin" element={
          <ProtectedRoute roles={['superuser']}><OutletRouter /></ProtectedRoute>
        }>
          <Route path="overview" element={<AdminOverviewView />} />
          <Route path="licenses" element={<LicensesView />} />
          <Route path="agencies" element={<AgenciesView />} />
          <Route path="updates" element={<UpdatesView />} />
          <Route index element={<Navigate to="overview" replace />} />
        </Route>

        {/* ── SECCION AGENCIA ── */}
        {/* Accesibles por Agency Admin, y también Superuser (developer root) */}
        <Route path="agency" element={
          <ProtectedRoute roles={['agency_admin', 'superuser']}><OutletRouter /></ProtectedRoute>
        }>
          <Route path="overview" element={<AgencyDashboardView />} />
          <Route path="leads" element={<GlobalLeadsView />} />
          <Route path="team" element={<TeamManagerView />} />
          <Route path="licenses" element={<AgencyLicensesView />} />
          <Route index element={<Navigate to="overview" replace />} />
        </Route>

        {/* ── SECCIÓN CONFIGURACIÓN (compartida por roles) ── */}
        <Route path="settings">
          <Route path="profiles" element={<ProtectedRoute><ProfilesView /></ProtectedRoute>} />
          <Route path="account" element={<ProtectedRoute><AccountView /></ProtectedRoute>} />
          <Route path="support" element={<ProtectedRoute><TicketView /></ProtectedRoute>} />
          <Route path="roles" element={<ProtectedRoute roles={['agency_admin', 'superuser']}><RolesView /></ProtectedRoute>} />
          <Route path="ticket-support" element={<ProtectedRoute roles={['superuser']}><TicketSupportView /></ProtectedRoute>} />
          <Route path="audit" element={<ProtectedRoute roles={['superuser']}><AuditView /></ProtectedRoute>} />
          <Route index element={<Navigate to="account" replace />} />
        </Route>

      </Route>

      {/* Rutas legacy redirigen al dashboard unificado */}
      <Route path="/console" element={<RoleRedirect />} />
      <Route path="/panel" element={<RoleRedirect />} />
      <Route path="/home" element={<RoleRedirect />} />

      {/* Raiz → redirige */}
      <Route path="/" element={<RoleRedirect />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

// Wrapper dummy para renderizar {children} subrutas de react-router
import { Outlet } from 'react-router-dom';
import { AgencyLicensesView } from './presentation/dashboard/views/AgencyLicensesView';
function OutletRouter() { return <Outlet />; }

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <SocketProvider>
              <AppRoutes />
            </SocketProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
