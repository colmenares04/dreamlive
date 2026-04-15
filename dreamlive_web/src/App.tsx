/**
 * App.tsx – Router principal con guards de roles.
 * 
 * Rutas:
 *   /login          → Publica (redirige si ya autenticado)
 *   /su-access      → Login de superusuario (privado, sin enlace)
 *   /register       → Publica
 *   /recover        → Publica
 *   /reset-password → Publica (con token en URL)
 *   /home           → Home unificado (muestra contenido segun rol)
 *   /profile        → Perfil de usuario
 *   /              → Redirige a /home si autenticado
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './infrastructure/context/AuthContext';
import { NotificationProvider } from './infrastructure/context/NotificationContext';
import { ProtectedRoute, PublicOnlyRoute } from './infrastructure/guards/ProtectedRoute';
import {
  LoginPage, AdminLoginPage, RegisterPage,
  RecoverPasswordPage, ResetPasswordPage
} from './presentation/auth/AuthPages';
import { HomePage } from './presentation/home/HomePage';
import { ProfilePage } from './presentation/shared/ProfilePage';
import { NotFoundPage } from './presentation/shared/ErrorPages';

function RoleRedirect() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to="/home" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Publicas */}
      <Route path="/login" element={
        <PublicOnlyRoute><LoginPage /></PublicOnlyRoute>
      } />
      <Route path="/su-access" element={
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

      {/* Home unificado – muestra contenido segun rol */}
      <Route path="/home" element={
        <ProtectedRoute><HomePage /></ProtectedRoute>
      } />

      {/* Rutas legacy redirigen al home */}
      <Route path="/console" element={<Navigate to="/home" replace />} />
      <Route path="/panel" element={<Navigate to="/home" replace />} />

      {/* Raiz → redirige al home */}
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
