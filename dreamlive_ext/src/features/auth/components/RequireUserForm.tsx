import React, { useState } from 'react';
import { Mail, Lock, Loader2, ArrowLeft, User as UserIcon } from 'lucide-react';
import { License } from '../../../infrastructure/api/auth.service';

interface Props {
  license: License;
  onSubmit: (name: string, email: string, pass: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const RequireUserForm: React.FC<Props> = ({ license, onSubmit, onCancel, isLoading }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && password) {
      onSubmit(name, email, password);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="text-center space-y-2 mb-2">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Registro de Administrador</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          La licencia <strong>{license.key}</strong> es válida pero requiere un usuario administrador. Completa tus datos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Nombre Completo
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <UserIcon size={18} />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
              placeholder="Ej. Juan Pérez"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Correo Electrónico
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail size={18} />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
              placeholder="admin@ejemplo.com"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Contraseña
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock size={18} />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 flex justify-center items-center py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-all duration-300"
          >
            <ArrowLeft size={16} className="mr-2" /> Volver
          </button>
          <button
            type="submit"
            disabled={isLoading || !name || !email || !password}
            className="flex-1 flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Registrar'}
          </button>
        </div>
      </form>
    </div>
  );
};
