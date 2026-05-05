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
  Sun,
  MonitorOff
} from 'lucide-react';

const VaultIcon = () => {
  const { theme } = useTheme();
  const mainColor = '#147374';
  const secondaryColor = '#0E3B41';

  return (
    <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4 drop-shadow-xl">
      <rect x="20" y="30" width="60" height="45" rx="10" stroke={mainColor} strokeWidth="2.5" fill="transparent" className="fill-white dark:fill-[#18181A] transition-colors" />
      <path d="M22 36 C 40 30, 60 30, 78 36" stroke={secondaryColor} strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="53" r="14" stroke={mainColor} strokeWidth="2.5" fill="none" />
      <circle cx="50" cy="53" r="9" stroke={secondaryColor} strokeWidth="1.5" fill="none" />
      <path d="M50 36 V 41 M50 65 V 70 M33 53 H 38 M62 53 H 67" stroke={mainColor} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="30" y="75" width="10" height="6" rx="3" fill={mainColor} />
      <rect x="60" y="75" width="10" height="6" rx="3" fill={mainColor} />
    </svg>
  );
};

export const AuthScreen: React.FC = () => {
  const {
    status, user, license, error, limitReachedInfo,
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
    <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 animate-fade-in">
      <div className="flex items-start gap-2">
        <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-[13px] font-medium text-red-800 dark:text-red-300">
            {typeof error === 'string' ? error : (error as any)?.message || JSON.stringify(error)}
          </p>
          {limitReachedInfo && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-500/20">
              <p className="text-[11px] text-amber-800 dark:text-amber-400 mb-2.5 font-medium leading-relaxed">
                Parece que ya tienes el máximo de sesiones activas ({limitReachedInfo.active}/{limitReachedInfo.max}).
              </p>
              <button
                onClick={() => {
                  if (view === 'email') loginWithEmail(email, pass, true);
                  else loginWithLicense(licenseKey, true);
                }}
                className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[12px] font-bold transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <MonitorOff size={14} />
                Desconectar otra y entrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const header = (
    <div className="flex justify-between items-center mb-10 w-full px-1">
      <div className="flex items-center gap-2">
        <Shield size={24} className="text-[#147374]" fill="#147374" fillOpacity={0.1} strokeWidth={2} />
        <span className="text-[#147374] font-extrabold text-2xl tracking-tighter">dreamlive</span>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-[#147374] transition-all" title="Cambiar tema">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>
    </div>
  );

  if (status === 'authenticated') {
    return (
      <Dashboard />
    );
  }

  return (
    <Card className="pb-8 border-none bg-transparent shadow-none dark:bg-transparent px-4">
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
            onClick={() => {
              if (limitReachedInfo) {
                handleLinkLicense(licenseKey, email, pass, email.split('@')[0], true);
              } else {
                handleLinkLicense(licenseKey, email, pass, email.split('@')[0]);
              }
            }}
          >
            {limitReachedInfo ? "Desconectar y vincular" : "Continuar"}
          </Button>
        </div>
      ) : status === 'needs_user_registration' ? (
        <div className="animate-fade-in">
          <VaultIcon />
          <h2 className="text-[17px] font-bold text-center text-[#333333] dark:text-gray-100 mb-6">Crear Agente</h2>
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
                onClick={() => {
                  if (limitReachedInfo) {
                    loginWithLicense(licenseKey, true);
                  } else {
                    loginWithLicense(licenseKey);
                  }
                }}
              >
                {limitReachedInfo ? "Desconectar y entrar" : "Continuar con SSO"}
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
