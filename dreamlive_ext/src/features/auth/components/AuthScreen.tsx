import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Card } from '../../../shared/components/ui/Card';
import { Dashboard } from '../../dashboard/components/Dashboard';
import {
  Briefcase,
  ExternalLink,
  Shield,
  ArrowLeft,
  AlertCircle,
  Moon,
  Sun
} from 'lucide-react';

const VaultIcon = () => {
  const { theme } = useTheme();
  const mainColor = theme === 'dark' ? '#2ea043' : '#102f5e';
  const secondaryColor = theme === 'dark' ? '#238636' : '#00c9e8';

  return (
    <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
      <rect x="20" y="30" width="60" height="45" rx="6" stroke={mainColor} strokeWidth="2" fill="transparent" className="fill-white dark:fill-[#161b22] transition-colors" />
      <path d="M22 36 C 40 30, 60 30, 78 36" stroke={secondaryColor} strokeWidth="1.5" fill="none" />
      <circle cx="50" cy="53" r="12" stroke={mainColor} strokeWidth="2" fill="none" />
      <circle cx="50" cy="53" r="8" stroke={secondaryColor} strokeWidth="1" fill="none" />
      <path d="M50 36 V 41 M50 65 V 70 M33 53 H 38 M62 53 H 67 M38 41 L 41.5 44.5 M58.5 61.5 L 62 65 M38 65 L 41.5 61.5 M58.5 44.5 L 62 41" stroke={mainColor} strokeWidth="2" strokeLinecap="round" />
      <rect x="28" y="75" width="8" height="5" rx="2" fill={mainColor} />
      <rect x="64" y="75" width="8" height="5" rx="2" fill={mainColor} />
    </svg>
  );
};

export const AuthScreen: React.FC = () => {
  const {
    status, user, license, error,
    loginWithEmail, loginWithLicense,
    handleLinkLicense, handleCreateAdmin,
    logout, clearError
  } = useAuth();

  const { theme, toggleTheme } = useTheme();

  const [view, setView] = useState<'email' | 'license'>('email');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [licenseKey, setLicenseKey] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPassConfirm, setRegPassConfirm] = useState('');

  const isLoading = status === 'loading';
  const passwordsMatch = regPass === regPassConfirm;

  const renderError = () => error && (
    <div className="mb-4 p-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 flex items-start gap-2 animate-fade-in">
      <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
      <p className="text-[13px] text-red-700 dark:text-red-400">{error}</p>
    </div>
  );

  const header = (
    <div className="flex justify-between items-center mb-10 w-full px-1">
      <div className="flex items-center gap-1.5">
        <Shield size={22} className="text-[#175DDC] dark:text-[#238636]" fill="currentColor" stroke="white" strokeWidth={1.5} />
        <span className="text-[#175DDC] dark:text-[#238636] font-medium text-xl tracking-tight">dreamlive</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={toggleTheme} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" title="Cambiar tema">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <ExternalLink size={20} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors" />
      </div>
    </div>
  );

  if (status === 'authenticated') {
    return (
      <Dashboard />
    );
  }

  return (
    <Card className="pb-8">
      {header}

      {status === 'needs_license' ? (
        <div className="animate-fade-in">
          <VaultIcon />
          <h2 className="text-[17px] font-bold text-center text-[#333333] dark:text-gray-100 mb-6">Vincular Licencia</h2>
          {renderError()}
          <Input
            label="Clave corporativa (obligatoria)"
            type="text"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            className="font-mono"
          />
          <Button
            className="mt-6"
            disabled={!licenseKey}
            isLoading={isLoading}
            onClick={() => handleLinkLicense(licenseKey, email, pass, email.split('@')[0])}
          >
            Continuar
          </Button>
        </div>
      ) : status === 'needs_user_registration' ? (
        <div className="animate-fade-in">
          <VaultIcon />
          <h2 className="text-[17px] font-bold text-center text-[#333333] dark:text-gray-100 mb-6">Crear Administrador</h2>
          {renderError()}
          <div className="space-y-4">
            <Input label="Nombre completo" type="text" value={regName} onChange={(e) => setRegName(e.target.value)} />
            <Input label="Correo electrónico" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
            <Input label="Contraseña" type="password" value={regPass} onChange={(e) => setRegPass(e.target.value)} />
            <Input
              label="Confirmar contraseña"
              type="password"
              value={regPassConfirm}
              onChange={(e) => setRegPassConfirm(e.target.value)}
              error={regPassConfirm && !passwordsMatch ? "Las contraseñas no coinciden" : undefined}
            />
          </div>
          <Button
            className="mt-6"
            disabled={!regName || !regEmail || !regPass || !passwordsMatch}
            isLoading={isLoading}
            onClick={() => handleCreateAdmin({ username: regName, email: regEmail, password: regPass })}
          >
            Crear cuenta
          </Button>
        </div>
      ) : (
        <div className="animate-fade-in">
          <VaultIcon />

          <h2 className="text-[17px] font-bold text-center text-[#333333] dark:text-gray-100 mb-6">
            Iniciar sesión en DreamLive
          </h2>

          {renderError()}

          {view === 'email' ? (
            <>
              <div className="space-y-4">
                <Input
                  label="Correo electrónico (obligatorio)"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label="Contraseña"
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                />
              </div>

              <div className="mt-6"></div>

              <Button
                disabled={!email || !pass}
                isLoading={isLoading}
                onClick={() => loginWithEmail(email, pass)}
              >
                Continuar
              </Button>

              <div className="text-center my-3 text-[11px] text-gray-500 dark:text-gray-400">o</div>

              <Button
                variant="outline"
                icon={<Briefcase size={16} />}
                onClick={() => { setView('license'); clearError(); }}
              >
                Usar clave de licencia
              </Button>
            </>
          ) : (
            <div className="animate-fade-in slide-in-from-right-4">
              <Input
                label="Identificador SSO (Licencia)"
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                className="font-mono"
              />

              <Button
                className="mt-6"
                disabled={!licenseKey}
                isLoading={isLoading}
                onClick={() => loginWithLicense(licenseKey)}
              >
                Continuar con SSO
              </Button>

              <div className="text-center my-3 text-[11px] text-gray-500 dark:text-gray-400">o</div>

              <Button
                variant="outline"
                icon={<ArrowLeft size={16} />}
                onClick={() => { setView('email'); clearError(); }}
              >
                Volver a Correo
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
