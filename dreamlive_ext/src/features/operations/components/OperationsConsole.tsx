import React, { useState } from 'react';
import { LeadsTable } from './LeadsTable';
import { Activity, Inbox, UserCheck, Search } from 'lucide-react';

type TabStatus = 'recopilado' | 'disponible' | 'contactado';

export const OperationsConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabStatus>('recopilado');

  const tabs: { id: TabStatus; label: string; icon: React.ReactNode; desc: string }[] = [
    { 
      id: 'recopilado', 
      label: 'Recopilados', 
      icon: <Search size={16} />,
      desc: 'Nuevos leads extraídos pendientes de validación técnica.'
    },
    { 
      id: 'disponible', 
      label: 'Disponibles', 
      icon: <Inbox size={16} />,
      desc: 'Leads validados listos para ser contactados masivamente.'
    },
    { 
      id: 'contactado', 
      label: 'Contactados', 
      icon: <UserCheck size={16} />,
      desc: 'Leads a los que ya se les ha enviado un mensaje.'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0d1117] rounded-xl border border-gray-200 dark:border-[#30363d] overflow-hidden shadow-sm animate-in fade-in duration-500">
      
      {/* Header Info */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-[#30363d] bg-gray-50/50 dark:bg-[#161b22]">
        <div className="flex items-center gap-2 mb-1">
          <Activity size={18} className="text-blue-500 dark:text-[#58a6ff]" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Base de Datos de Leads</h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Gestiona los prospectos capturados, su disponibilidad y el historial de contacto.
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#0d1117]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 flex flex-col items-center justify-center gap-1.5 border-b-2 transition-colors relative
              ${activeTab === tab.id 
                ? 'border-blue-500 text-blue-600 dark:border-[#58a6ff] dark:text-[#58a6ff] bg-blue-50/30 dark:bg-[#58a6ff]/5' 
                : 'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-[#161b22] hover:text-gray-700 dark:text-gray-400'}`}
          >
            <div className="flex items-center gap-2">
              {tab.icon}
              <span className="text-xs font-bold uppercase tracking-wide">{tab.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Active Tab Content Info */}
      <div className="px-5 py-3 bg-gray-50/30 dark:bg-[#161b22]/30 border-b border-gray-100 dark:border-[#30363d]/50">
        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 opacity-60"></span>
          {tabs.find(t => t.id === activeTab)?.desc}
        </p>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-hidden p-4">
        {/* Usamos key para forzar el re-render y que la tabla limpie su estado al cambiar de tab */}
        <LeadsTable key={activeTab} status={activeTab} />
      </div>

    </div>
  );
};
