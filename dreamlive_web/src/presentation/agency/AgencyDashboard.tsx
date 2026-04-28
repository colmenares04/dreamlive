import React, { useState } from 'react';
import { useAgencyData } from './hooks/useAgencyData';
import { AgencyLayout } from './components/AgencyLayout';
import { AgencyOverviewSection } from './sections/AgencyOverviewSection';

export function AgencyDashboard() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  
  const { dashboard: data, loadingDash: loading, loadDashboard } = useAgencyData();

  return (
    <AgencyLayout activeMenu={activeMenu} onNavigate={setActiveMenu}>
      {activeMenu === 'dashboard' && (
        <AgencyOverviewSection 
          data={data} 
          loading={loading} 
          onRefresh={loadDashboard} 
        />
      )}
      
      {activeMenu === 'leads' && (
        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm animate-fade-in">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Global Leads Database</h2>
          <p className="text-slate-500 mb-6">Gestión unificada de prospectos - En Desarrollo</p>
        </div>
      )}
      
      {activeMenu === 'team' && (
        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm animate-fade-in">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Team Management</h2>
          <p className="text-slate-500 mb-6">Administración de credenciales y límites - En Desarrollo</p>
        </div>
      )}
    </AgencyLayout>
  );
}
