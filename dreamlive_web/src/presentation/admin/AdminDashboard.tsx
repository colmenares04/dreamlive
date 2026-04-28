import React, { useState } from 'react';
import { useAdminData } from './hooks/useAdminData';
import { AdminLayout } from './components/AdminLayout';
import { AdminOverviewSection } from './sections/AdminOverviewSection';

export function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState('overview');

  const {
    overview,
    loadingOverview,
    loadOverview,
    purgePendingLeads,
    days,
    setDays,
  } = useAdminData();

  return (
    <AdminLayout activeMenu={activeMenu} onNavigate={setActiveMenu}>
      {activeMenu === 'overview' && (
        <AdminOverviewSection
          overview={overview}
          loading={loadingOverview}
          onRefresh={loadOverview}
          onPurge={purgePendingLeads}
          days={days}
          onDaysChange={setDays}
        />
      )}
      {activeMenu === 'licenses' && (
        <div className="bg-white rounded-xl p-8 border border-slate-200">
          <h3 className="text-xl font-bold text-slate-800">Sección de Licencias</h3>
          <p className="text-slate-500 mt-2">En desarrollo para este plan.</p>
        </div>
      )}
      {activeMenu === 'agencies' && (
        <div className="bg-white rounded-xl p-8 border border-slate-200">
          <h3 className="text-xl font-bold text-slate-800">Sección de Agencias</h3>
          <p className="text-slate-500 mt-2">En desarrollo para este plan.</p>
        </div>
      )}
      {activeMenu === 'updates' && (
        <div className="bg-white rounded-xl p-8 border border-slate-200">
          <h3 className="text-xl font-bold text-slate-800">Actualizaciones</h3>
          <p className="text-slate-500 mt-2">En desarrollo para este plan.</p>
        </div>
      )}
    </AdminLayout>
  );
}
