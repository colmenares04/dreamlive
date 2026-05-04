/**
 * UpdatesView – Centro de actualizaciones de app.
 * Feature parity con AdminUP.html: publicar versión dual (Win+Mac), tabla de historial,
 * activar/desactivar versión, eliminar.
 */
import React, { useState, useRef } from 'react';
import { useAdminData } from '../../admin/hooks/useAdminData';
import { PageHeader, Button, DataTable, Badge } from '../../shared';
import { formatDate } from '../../../core/utils';
import type { AppVersion, VersionTag } from '../../../core/entities';

// ─── Constantes de tags ────────────────────────────────────────────────────
const TAG_META: Record<VersionTag, { label: string; icon: string; cls: string }> = {
  new: { label: 'Novedad', icon: 'fa-sparkles', cls: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  fix: { label: 'Fix', icon: 'fa-bug', cls: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400' },
  feat: { label: 'Feature', icon: 'fa-star', cls: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  perf: { label: 'Rendimiento', icon: 'fa-bolt', cls: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  sec: { label: 'Seguridad', icon: 'fa-shield-halved', cls: 'bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400' },
};

const TAG_KEYS = Object.keys(TAG_META) as VersionTag[];

// ─── Componente Chip de Tag ────────────────────────────────────────────────
function TagChip({ tag, selected, onToggle }: { tag: VersionTag; selected: boolean; onToggle: () => void }) {
  const { label, icon, cls } = TAG_META[tag];
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selected
        ? `${cls} border-current scale-105 shadow-sm`
        : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-300'
        }`}>
      <i className={`fas ${icon} text-[10px]`} />
      {label}
    </button>
  );
}

// ─── Mini tags para tabla ──────────────────────────────────────────────────
function MiniTag({ tag }: { tag: VersionTag }) {
  const { label, cls } = TAG_META[tag];
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mr-1 mb-1 ${cls}`}>{label}</span>
  );
}

// ─── Upload box ────────────────────────────────────────────────────────────
interface UploadBoxProps {
  platform: 'windows' | 'macos';
  file: File | null;
  onFile: (f: File) => void;
}

function UploadBox({ platform, file, onFile }: UploadBoxProps) {
  const ref = useRef<HTMLInputElement>(null);
  const isWin = platform === 'windows';

  return (
    <div
      onClick={() => ref.current?.click()}
      className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${file
        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/5'
        : 'border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-slate-400 hover:bg-white dark:hover:bg-slate-800'
        }`}>
      <input
        ref={ref}
        type="file"
        accept={isWin ? '.zip,.exe' : '.dmg,.zip'}
        className="hidden"
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <i className={`fab ${isWin ? 'fa-windows text-blue-500' : 'fa-apple text-slate-600 dark:text-slate-400'} text-3xl mb-2 block`} />
      <p className="font-bold text-slate-700 dark:text-white">{isWin ? 'Windows Build' : 'MacOS Build'}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
        {file
          ? <span className="text-emerald-700 font-semibold">📦 {file.name}</span>
          : `Click para seleccionar ${isWin ? '.zip o .exe' : '.dmg o .zip'}`
        }
      </p>
    </div>
  );
}

// ─── Vista principal ───────────────────────────────────────────────────────
export function UpdatesView() {
  const { versions, loadingDeps, publishVersion, activateVersion, deleteVersion } = useAdminData();

  // Formulario
  const [versionNum, setVersionNum] = useState('');
  const [changelog, setChangelog] = useState('');
  const [tags, setTags] = useState<Set<VersionTag>>(new Set());
  const [fileWin, setFileWin] = useState<File | null>(null);
  const [fileMac, setFileMac] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [publishing, setPublishing] = useState(false);

  const toggleTag = (tag: VersionTag) =>
    setTags(prev => { const s = new Set(prev); s.has(tag) ? s.delete(tag) : s.add(tag); return s; });

  const handlePublish = async () => {
    if (!versionNum.trim() || !fileWin || !fileMac) return;
    setPublishing(true);
    setProgress(10);

    // Construir FormData con los archivos reales
    setProgress(30);
    const formData = new FormData();
    formData.append('version_number', versionNum.trim());
    formData.append('changelog', changelog);
    formData.append('tags', Array.from(tags).join(','));
    formData.append('win_file', fileWin);
    formData.append('mac_file', fileMac);

    setProgress(70);
    await publishVersion(formData);
    setProgress(100);
    setTimeout(() => {
      setPublishing(false);
      setProgress(0);
      setVersionNum('');
      setChangelog('');
      setTags(new Set());
      setFileWin(null);
      setFileMac(null);
    }, 1500);
  };

  const columns = [
    {
      key: 'version_number' as const,
      header: 'Versión',
      render: (v: AppVersion) => (
        <div>
          <span className="font-bold text-teal-700">{v.version_number}</span>
          {v.is_active && <Badge variant="green" className="ml-2">ACTIVA</Badge>}
        </div>
      ),
    },
    {
      key: 'platform' as const,
      header: 'Plat.',
      render: (v: AppVersion) => (
        v.platform === 'windows'
          ? <i className="fab fa-windows text-blue-500 text-lg" title="Windows" />
          : <i className="fab fa-apple text-slate-600 text-lg" title="MacOS" />
      ),
    },
    {
      key: 'tags' as const,
      header: 'Etiquetas',
      render: (v: AppVersion) => (
        <div>{(v.tags ?? []).map(t => <MiniTag key={t} tag={t} />)}</div>
      ),
    },
    {
      key: 'changelog' as const,
      header: 'Changelog',
      render: (v: AppVersion) => (
        <span className="text-xs text-slate-500 line-clamp-2">{v.changelog || '—'}</span>
      ),
    },
    {
      key: 'release_date' as const,
      header: 'Fecha',
      render: (v: AppVersion) => (
        <div>
          <p className="text-xs text-slate-600">{formatDate(v.release_date)}</p>
          <p className="text-[10px] text-slate-400">{(v.file_size_kb / 1024).toFixed(2)} MB</p>
        </div>
      ),
    },
    {
      key: 'id' as const,
      header: 'Acciones',
      render: (v: AppVersion) => (
        <div className="flex gap-1 justify-end">
          <a href={`${(import.meta.env.VITE_API_URL || 'https://api.dreamlive.app/api/v2').split('/api/')[0]}${v.file_url}`} target="_blank" rel="noreferrer"
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Descargar">
            <i className="fas fa-download text-slate-500 text-sm" />
          </a>
          {!v.is_active && (
            <button onClick={() => activateVersion(v.id)} title="Activar"
              className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors">
              <i className="fas fa-power-off text-emerald-500 text-sm" />
            </button>
          )}
          <button onClick={() => deleteVersion(v.id)} title="Eliminar"
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
            <i className="fas fa-trash text-red-400 text-sm" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Centro de Actualizaciones"
        subtitle="Gestión de versiones unificadas para Windows y MacOS"
      />

      {/* Panel de publicación */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 p-6 space-y-5 glass-card">
        {/* Fila: versión + tags */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="sm:w-40">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Versión (ej: 0.0.6)</label>
            <input
              type="text"
              value={versionNum}
              onChange={e => setVersionNum(e.target.value)}
              placeholder="x.y.z"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Tipo de Cambios</label>
            <div className="flex flex-wrap gap-2">
              {TAG_KEYS.map(tag => (
                <TagChip key={tag} tag={tag} selected={tags.has(tag)} onToggle={() => toggleTag(tag)} />
              ))}
            </div>
          </div>
        </div>

        {/* Upload boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UploadBox platform="windows" file={fileWin} onFile={setFileWin} />
          <UploadBox platform="macos" file={fileMac} onFile={setFileMac} />
        </div>

        {/* Changelog */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Changelog General</label>
          <textarea
            value={changelog}
            onChange={e => setChangelog(e.target.value)}
            rows={2}
            placeholder="Escribe las mejoras generales..."
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none dark:text-white"
          />
        </div>

        {/* Acción + barra de progreso */}
        <div className="flex items-center gap-4">
          <Button
            variant="primary"
            loading={publishing}
            onClick={handlePublish}
            id="btn-publish-version"
            disabled={!versionNum || !fileWin || !fileMac}>
            <i className="fas fa-cloud-arrow-up mr-2" />Publicar Versión Dual
          </Button>
          {publishing && (
            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-slate-500">{progress}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabla historial */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden glass-card">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5">
          <h3 className="font-semibold text-slate-700 dark:text-white">Historial de Versiones</h3>
        </div>
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={versions}
            loading={loadingDeps}
            keyExtractor={v => v.id}
            emptyMessage="No hay versiones publicadas aún."
          />
        </div>
      </div>
    </div>
  );
}
