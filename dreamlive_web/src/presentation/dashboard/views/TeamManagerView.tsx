/**
 * TeamManagerView.tsx
 * 
 * REDISEÑO PREMIUM + CORRECCIÓN DE PERSISTENCIA
 * Gestión de credenciales y límites del equipo con estética de vanguardia.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useAgencyData } from '../../agency/hooks/useAgencyData';
import { PageHeader, Button, Badge, Modal } from '../../shared';
import { formatDate } from '../../../core/utils';
import { useNotifications } from '../../../contexts';
import clsx from 'clsx';
import type { License } from '../../../core/entities';

// ─── Celda Editable Premium ──────────────────────────────────────────────────
function EditableCell({
  value,
  type = 'text',
  onSave,
  label
}: {
  value: string | number;
  type?: 'text' | 'number' | 'password';
  onSave: (v: string) => Promise<void>;
  label: string;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(String(value));
  const [saving, setSaving]   = useState(false);
  const [status, setStatus]   = useState<'idle' | 'saved' | 'error'>('idle');
  const [peek, setPeek] = useState(false);

  const handleBlur = async () => {
    if (val === String(value)) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(val);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (!editing) {
    return (
      <div 
        className={clsx(
          "group relative p-3 rounded-2xl border transition-all h-full min-h-[50px] flex flex-col justify-center",
          status === 'saved' ? "border-emerald-500/30 bg-emerald-500/5" :
          status === 'error' ? "border-rose-500/30 bg-rose-500/5" :
          "border-transparent hover:border-indigo-500/20 hover:bg-slate-50 dark:hover:bg-white/5"
        )}
      >
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
          {label}
        </span>
        <div className="flex items-center justify-between gap-2">
          <span 
            onClick={() => setEditing(true)}
            className={clsx(
              "text-sm font-bold tracking-tight cursor-pointer flex-1",
              status === 'saved' ? "text-emerald-500" :
              status === 'error' ? "text-rose-500" :
              "text-slate-700 dark:text-slate-300"
            )}>
            {type === 'password' && !peek ? '••••••••' : val || <span className="text-slate-300 italic font-normal">Vacío</span>}
          </span>
          {type === 'password' && (
            <button 
              onClick={(e) => { e.stopPropagation(); setPeek(!peek); }}
              className="text-slate-400 hover:text-indigo-500 transition-colors p-1"
              title={peek ? "Ocultar" : "Mostrar"}
            >
              <i className={`fas ${peek ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
            </button>
          )}
        </div>
        {status === 'saved' && <i className="fas fa-check-circle absolute top-2 right-2 text-[10px] text-emerald-500 animate-bounce" />}
      </div>
    );
  }

  return (
    <div className="p-1 animate-in fade-in zoom-in duration-200">
      <input
        autoFocus
        type={type}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => { if (e.key === 'Enter') handleBlur(); if (e.key === 'Escape') setEditing(false); }}
        disabled={saving}
        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-2xl text-sm font-bold shadow-xl shadow-indigo-500/10 focus:outline-none transition-all"
      />
    </div>
  );
}

// ─── Fila de Licencia ────────────────────────────────────────────────────────
function LicenseRow({ license, onSave }: { license: License; onSave: (field: string, value: string) => Promise<void> }) {
  const isExpired = license.expires_at ? new Date(license.expires_at) < new Date() : false;
  const isActive  = license.status === 'active' && !isExpired;

  return (
    <tr className="group border-b border-slate-50 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
      <td className="px-6 py-4">
        <EditableCell label="Nombre Reclutador" value={license.recruiter_name} onSave={v => onSave('recruiter_name', v)} />
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Identificador</span>
          <span className="font-mono text-xs text-indigo-500 font-black tracking-tighter">{license.key}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <EditableCell label="Límite" value={license.request_limit} type="number" onSave={v => onSave('request_limit', v)} />
      </td>
      <td className="px-6 py-4">
        <EditableCell label="Ciclo (min)" value={license.refresh_minutes} type="number" onSave={v => onSave('refresh_minutes', v)} />
      </td>
      <td className="px-6 py-4">
        <EditableCell label="Clave Admin" value={license.admin_password || ''} type="password" onSave={v => onSave('admin_password', v)} />
      </td>
      <td className="px-6 py-4 text-center">
        <Badge variant={isActive ? 'green' : isExpired ? 'yellow' : 'gray'}>
          {isActive ? 'ACTIVO' : isExpired ? 'EXPIRADA' : 'INACTIVO'}
        </Badge>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col text-right">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vencimiento</span>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            {license.expires_at ? formatDate(license.expires_at) : 'SIN FECHA'}
          </span>
        </div>
      </td>
    </tr>
  );
}


// ─── Vista principal ──────────────────────────────────────────────────────────
export function TeamManagerView() {
  const { teamLicenses, loadingTeam, loadTeam, updateLicenseField } = useAgencyData();
  const [search, setSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filtered = teamLicenses.filter(l => 
    l.recruiter_name.toLowerCase().includes(search.toLowerCase()) || 
    l.key.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { loadTeam(); }, []); // eslint-disable-line

  const handleSave = (licenseId: string) => async (field: string, value: string) => {
    await updateLicenseField(licenseId, field as any, value);
  };

  return (
    <div className="space-y-8 animate-fade-in p-2">
      <PageHeader
        title="Gestión de Reclutadores"
        subtitle="Administra credenciales, límites y ciclos de refresco de tu equipo en tiempo real."
      />

      <div className="glass-card rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5 px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Listado de Equipo ({filtered.length})</h3>
          <div className="relative group">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Buscar reclutador o licencia..." 
              className="pl-11 pr-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all w-full sm:w-64" 
            />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-white/5 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <th className="px-6 py-4 text-left">Información del Perfil</th>
                <th className="px-6 py-4 text-left">ID Licencia</th>
                <th className="px-6 py-4 text-left">Peticiones</th>
                <th className="px-6 py-4 text-left">Refresco</th>
                <th className="px-6 py-4 text-left">Clave Admin</th>
                <th className="px-6 py-4 text-center">Estatus</th>
                <th className="px-6 py-4 text-right">Vigencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {loadingTeam ? (
                <tr>
                   <td colSpan={7} className="py-20 text-center text-slate-400 font-bold italic"><i className="fas fa-spinner fa-spin mr-3" /> Sincronizando equipo...</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                   <td colSpan={7} className="py-20 text-center text-slate-400 font-bold italic">No se encontraron reclutadores.</td>
                </tr>
              ) : (
                paginated.map(lic => (
                  <LicenseRow key={lic.id} license={lic} onSave={handleSave(lic.id)} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Hint */}
        <div className="px-8 py-6 bg-slate-50/50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Haz clic en cualquier celda para editar y presiona <span className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-indigo-500 mx-1">ENTER</span> para guardar.
          </div>

          <div className="flex items-center gap-2">
             <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)} className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-20 transition-all shadow-sm"><i className="fas fa-chevron-left text-xs" /></button>
             <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-black tabular-nums">
                {currentPage} / {totalPages || 1}
             </div>
             <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(c => c + 1)} className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-20 transition-all shadow-sm"><i className="fas fa-chevron-right text-xs" /></button>
          </div>
        </div>
      </div>

    </div>
  );
}
