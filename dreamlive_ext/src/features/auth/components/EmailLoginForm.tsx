import React, { useState } from 'react';
import { Mail, Lock, Loader2 } from 'lucide-react';

interface Props {
  onSubmit: (email: string, pass: string) => void;
  isLoading: boolean;
}

export const EmailLoginForm: React.FC<Props> = ({ onSubmit, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      onSubmit(email, password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-fade-in">
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

      <button
        type="submit"
        disabled={isLoading || !email || !password}
        className="mt-2 w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
      >
        {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Iniciar Sesión'}
      </button>
    </form>
  );
};
