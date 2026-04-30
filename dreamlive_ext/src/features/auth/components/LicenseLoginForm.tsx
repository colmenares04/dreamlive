import React, { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';

interface Props {
  onSubmit: (licenseKey: string) => void;
  isLoading: boolean;
}

export const LicenseLoginForm: React.FC<Props> = ({ onSubmit, isLoading }) => {
  const [licenseKey, setLicenseKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (licenseKey) {
      onSubmit(licenseKey);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-fade-in">
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Clave de Licencia
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <KeyRound size={18} />
          </div>
          <input
            type="text"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 font-mono"
            placeholder="XXXX-XXXX-XXXX-XXXX"
            required
            disabled={isLoading}
          />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Ingresa la clave de licencia provista por tu administrador.
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading || !licenseKey}
        className="mt-2 w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
      >
        {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Validar Licencia'}
      </button>
    </form>
  );
};
