import React from 'react';
import { useAuth } from '../../contexts';
import { AdminDashboard } from '../admin/AdminDashboard';
import { AgencyDashboard } from '../agency/AgencyDashboard';

/**
 * HomePage - Actúa como enrutador según el rol del usuario utilizando los nuevos diseños
 * unificados (AdminUP y PanelAdm).
 */
export function HomePage() {
  const { isAdminGroup } = useAuth();

  // Renderizado condicional basado en rol (superusuario o agency_admin)
  if (isAdminGroup) {
    return <AdminDashboard />;
  }

  // Vista para agencias
  return <AgencyDashboard />;
}
