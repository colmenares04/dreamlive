/**
 * RolesView – Gestión elegante de permisos por rol para la agencia.
 * @module RolesView
 */
import React, { useState, useEffect } from 'react';
import { PageHeader, Button, Card, Badge } from '../../shared';
import { useAgencyPermissions } from '../../../hooks/useAgencyPermissions';
import { useNotifications } from '../../../contexts';
import type { AgencyPermissionsConfig, RolePermissions } from '../../../core/entities';

const PERMISSION_LABELS: Record<keyof RolePermissions, { label: string, desc: string, icon: string }> = {
  can_manage_team: { label: 'Gestionar Equipo', desc: 'Permite crear, editar y eliminar usuarios de la agencia.', icon: 'fa-users-cog' },
  can_manage_licenses: { label: 'Ver Licencias', desc: 'Permite visualizar y copiar las llaves de acceso de la agencia.', icon: 'fa-key' },
  can_view_metrics: { label: 'Métricas y Dashboard', desc: 'Acceso a las estadísticas de rendimiento y gráficas.', icon: 'fa-chart-line' },
  can_purge_leads: { label: 'Purgar Leads', desc: 'Permite eliminar prospectos masivamente de la base de datos.', icon: 'fa-trash-alt' },
  can_view_leads: { label: 'Ver Leads', desc: 'Acceso a la tabla de prospectos capturados.', icon: 'fa-address-book' },
  can_open_tickets: { label: 'Abrir Tickets', desc: 'Permite crear nuevos reportes de soporte técnico.', icon: 'fa-headset' },
};

/**
 * RolesView
 * Interfaz administrativa para que el Agency Manager defina los límites 
 * de Agents y Visitors.
 */
export function RolesView() {
  const { permissions, loading, error, updatePermissions } = useAgencyPermissions();
  const { success, error: notifyError } = useNotifications();
  const [localConfig, setLocalConfig] = useState<AgencyPermissionsConfig | null>(null);

  useEffect(() => {
    if (permissions) setLocalConfig(JSON.parse(JSON.stringify(permissions)));
  }, [permissions]);

  const handleToggle = (role: 'agent' | 'visitor', key: keyof RolePermissions) => {
    if (!localConfig) return;
    const newConfig = { ...localConfig };
    newConfig[role][key] = !newConfig[role][key];
    setLocalConfig(newConfig);
  };

  const handleSave = async () => {
    if (!localConfig) return;
    const ok = await updatePermissions(localConfig);
    if (ok) success('Configuración de roles guardada correctamente.');
    else notifyError('Error al guardar la configuración.');
  };

  if (loading && !localConfig) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-400">Cargando matriz de permisos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-scale-in">
      <PageHeader
        title="Roles y Privilegios"
        subtitle="Define qué puede hacer cada integrante de tu equipo con precisión quirúrgica"
        actions={
          <Button 
            variant="primary" 
            onClick={handleSave} 
            loading={loading}
            className="shadow-xl shadow-indigo-500/20"
          >
            <i className="fas fa-save mr-2" /> Guardar Cambios
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PANEL: AGENTE */}
        <RoleCard 
          roleName="Agente"
          roleId="agent"
          description="Personal operativo con acceso a herramientas de reclutamiento."
          icon="fa-user-tie"
          color="indigo"
          config={localConfig?.agent}
          onToggle={(key) => handleToggle('agent', key)}
        />

        {/* PANEL: VISITANTE */}
        <RoleCard 
          roleName="Visitante"
          roleId="visitor"
          description="Acceso limitado, ideal para auditores o visualización de solo lectura."
          icon="fa-eye"
          color="slate"
          config={localConfig?.visitor}
          onToggle={(key) => handleToggle('visitor', key)}
        />
      </div>

      {/* Info Alert */}
      <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 p-6 rounded-3xl flex gap-4 items-start glass">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0 text-indigo-500">
          <i className="fas fa-info-circle text-lg" />
        </div>
        <div>
          <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-1">Nota de Seguridad</h4>
          <p className="text-sm text-indigo-700/70 dark:text-indigo-300/50 leading-relaxed">
            Como <strong>Manager de Agencia</strong>, siempre tendrás acceso total. Estos cambios solo afectan a los usuarios registrados con roles de Agente o Visitante dentro de tu organización.
          </p>
        </div>
      </div>
    </div>
  );
}

interface RoleCardProps {
  roleName: string;
  roleId: string;
  description: string;
  icon: string;
  color: string;
  config?: RolePermissions;
  onToggle: (key: keyof RolePermissions) => void;
}

function RoleCard({ roleName, description, icon, color, config, onToggle }: RoleCardProps) {
  if (!config) return null;

  return (
    <Card className="p-0 overflow-hidden border-slate-100 dark:border-slate-800/50 shadow-2xl glass-card">
      <div className={`p-8 bg-gradient-to-br from-${color}-500/5 to-transparent border-b border-slate-100 dark:border-slate-800/50`}>
        <div className="flex items-center gap-4 mb-3">
          <div className={`w-12 h-12 rounded-2xl bg-${color}-500/10 flex items-center justify-center text-${color}-500`}>
            <i className={`fas ${icon} text-xl`} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight">{roleName}</h3>
            <Badge variant="gray" className="text-[10px] mt-1 uppercase tracking-widest">Configuración Personalizada</Badge>
          </div>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
      </div>

      <div className="p-4 md:p-6 space-y-3">
        {(Object.keys(PERMISSION_LABELS) as Array<keyof RolePermissions>).map((key) => {
          const { label, desc, icon: pIcon } = PERMISSION_LABELS[key];
          const active = config[key];

          return (
            <div 
              key={key}
              onClick={() => onToggle(key)}
              className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                active 
                  ? 'bg-white dark:bg-slate-900/50 border-indigo-100 dark:border-indigo-500/20 shadow-sm' 
                  : 'bg-slate-50/50 dark:bg-slate-950/20 border-transparent opacity-60 grayscale-[0.5]'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                active ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}>
                <i className={`fas ${pIcon}`} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</div>
                <div className="text-[11px] text-slate-400 line-clamp-1">{desc}</div>
              </div>
              <div className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                active ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                  active ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
