/**
 * App.tsx – Router principal con guards de roles.
 * Rutas:
 *   /login          → Pública (redirige si ya autenticado)
 *   /register       → Pública
 *   /recover        → Pública
 *   /reset-password → Pública (con token en URL)
 *   /console/*      → Admin, Programmer
 *   /panel/*        → Owner, Agent
 *   /              → Redirige según rol
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './infrastructure/context/AuthContext';
import { NotificationProvider } from './infrastructure/context/NotificationContext';
import { ProtectedRoute, PublicOnlyRoute } from './infrastructure/guards/ProtectedRoute';
import {
  LoginPage, AdminLoginPage, RegisterPage,
  RecoverPasswordPage, ResetPasswordPage
} from './presentation/auth/AuthPages';
import { AdminConsole } from './presentation/admin/AdminConsole';
import { AgencyPanel } from './presentation/panel/AgencyPanel';
import { ProfilePage } from './presentation/shared/ProfilePage';
import { NotFoundPage } from './presentation/shared/ErrorPages';

function RoleRedirect() {
  const { isAuthenticated, isAdminGroup } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={isAdminGroup ? '/console' : '/panel'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={
        <PublicOnlyRoute><LoginPage /></PublicOnlyRoute>
      } />
      <Route path="/console-login" element={
        <PublicOnlyRoute><AdminLoginPage /></PublicOnlyRoute>
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

      {/* Admin Console – Admin y Programmer */}
      <Route path="/console" element={
        <ProtectedRoute roles={['admin', 'programmer']}>
          <AdminConsole />
        </ProtectedRoute>
      } />

      {/* Agency Panel – Owner y Agent */}
      <Route path="/panel" element={
        <ProtectedRoute roles={['owner', 'agent']}>
          <AgencyPanel />
        </ProtectedRoute>
      } />

      {/* Raíz → redirige al panel correcto */}
      <Route path="/" element={<RoleRedirect />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
