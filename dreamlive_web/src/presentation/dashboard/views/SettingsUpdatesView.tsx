import React, { useEffect, useState } from 'react';
import { PageHeader, Button } from '../../shared';
import { VersionAdapter } from '../../../services/http/version';
import type { AppVersion } from '../../../core/entities';
import { formatDate } from '../../../core/utils';

export function SettingsUpdatesView() {
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await VersionAdapter.list();
        setVersions(data.filter(v => v.is_active));
      } catch (err) {
        console.error('Error loading versions', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const winVersion = versions.find(v => v.platform === 'windows');
  const macVersion = versions.find(v => v.platform === 'macos');

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <PageHeader
        title="Actualización de la Aplicación"
        subtitle="Descarga la última versión de DreamLive disponible para tu sistema operativo."
      />

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <i className="fas fa-circle-notch fa-spin text-3xl text-indigo-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Tarjeta Windows */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 p-8 flex flex-col items-center text-center transition-transform hover:-translate-y-1 hover:shadow-md">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
              <i className="fab fa-windows text-4xl text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Para Windows</h3>

            {winVersion ? (
              <>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Versión {winVersion.version_number} <br />
                  <span className="text-xs opacity-75">Publicada el {formatDate(winVersion.release_date)}</span>
                </p>
                <a href={`${(import.meta.env.VITE_API_URL || 'http://217.216.94.178:8000').replace(/\/api\/v[12]$/, '')}${winVersion.file_url}`} target="_blank" rel="noreferrer" className="w-full">
                  <Button variant="primary" className="w-full justify-center text-base py-3">
                    <i className="fas fa-download mr-2" />
                    Descargar Windows
                  </Button>
                </a>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center w-full">
                <p className="text-sm text-slate-400 italic bg-slate-50 dark:bg-white/5 w-full py-4 rounded-xl">No hay versión disponible</p>
              </div>
            )}
          </div>

          {/* Tarjeta MacOS */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 p-8 flex flex-col items-center text-center transition-transform hover:-translate-y-1 hover:shadow-md">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <i className="fab fa-apple text-4xl text-slate-700 dark:text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Para MacOS</h3>

            {macVersion ? (
              <>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Versión {macVersion.version_number} <br />
                  <span className="text-xs opacity-75">Publicada el {formatDate(macVersion.release_date)}</span>
                </p>
                <a href={`${(import.meta.env.VITE_API_URL || 'http://217.216.94.178:8000').replace(/\/api\/v[12]$/, '')}${macVersion.file_url}`} target="_blank" rel="noreferrer" className="w-full">
                  <Button variant="primary" className="w-full justify-center text-base py-3">
                    <i className="fas fa-download mr-2" />
                    Descargar MacOS
                  </Button>
                </a>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center w-full">
                <p className="text-sm text-slate-400 italic bg-slate-50 dark:bg-white/5 w-full py-4 rounded-xl">No hay versión disponible</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historial de cambios */}
      {!loading && (winVersion || macVersion) && (
        <div className="mt-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 p-6 md:p-8">
          <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <i className="fas fa-list-ul text-indigo-500" /> Notas de la versión
          </h4>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">
              {winVersion?.changelog || macVersion?.changelog || "Sin notas adicionales."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
