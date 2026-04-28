/**
 * Paginas de autenticacion:
 *   LoginPage, RegisterPage, RecoverPasswordPage, ResetPasswordPage
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../../contexts';
import { AuthAdapter, TokenStorage } from '../../services';
import { CaptchaBox } from '../../hooks';

// ── Iconos ─────────────────────────────────────────────────────────────────
const Icons = {
  bolt: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  users: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  shield: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  chart: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  rocket: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  ),
  mail: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  arrowLeft: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
};

// ── Features Data ──────────────────────────────────────────────────────────
const features = [
  {
    icon: Icons.users,
    title: 'Gestión de Leads',
    description: 'Captura y gestiona leads de forma automatizada',
  },
  {
    icon: Icons.chart,
    title: 'Estadísticas en Tiempo Real',
    description: 'Monitorea el rendimiento de tu equipo',
  },
  {
    icon: Icons.shield,
    title: 'Seguridad Avanzada',
    description: 'Protección de datos y licencias seguras',
  },
  {
    icon: Icons.rocket,
    title: 'Automatización Total',
    description: 'Optimiza tu flujo de trabajo con IA',
  },
];

// ── Componentes auxiliares ─────────────────────────────────────────────────
/**
 * AuthLayout
 * 
 * Contenedor de doble panel para las páginas de autenticación.
 * Incluye un panel izquierdo con branding y características (oculto en mobile)
 * y un panel derecho para los formularios.
 */
function AuthLayout({ children, showBranding = true, maxWidth = 'max-w-md' }: { children: React.ReactNode; showBranding?: boolean; maxWidth?: string }) {
  return (
    <div className="min-h-screen flex bg-white text-slate-900 selection:bg-indigo-100 overflow-hidden">
      {/* Panel izquierdo - Branding Premium Dark (Contraste Máximo) */}
      {showBranding && (
        <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-[#050912] relative overflow-hidden border-r border-white/5">
          {/* Vibrant mesh gradients for deep contrast */}
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[100px]" />

          {/* Industrial Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.1]" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />

          {/* Content Wrapper */}
          <div className="relative z-10 flex flex-col justify-between p-16 xl:p-24 w-full">
            {/* Brand Header */}
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center text-slate-950 shadow-2xl shadow-indigo-500/20">
                {Icons.bolt}
              </div>
              <div>
                <h1 className="text-white font-black text-4xl tracking-tighter leading-none">DREAM<span className="text-indigo-400">LIVE</span></h1>
                <p className="text-indigo-400/50 text-[10px] font-black tracking-[0.4em] uppercase mt-2">Industrial Intelligence</p>
              </div>
            </div>

            {/* Main Value Proposition */}
            <div className="space-y-20">
              <div className="max-w-xl">
                <h2 className="text-6xl xl:text-8xl font-black text-white leading-[0.85] tracking-tighter mb-10">
                  DIGITAL <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 via-blue-400 to-indigo-600">
                    PRECISION
                  </span>
                </h2>
                <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-md border-l-4 border-indigo-500 pl-6">
                  Arquitectura robusta para la captación masiva de activos y gestión de equipos de alto rendimiento.
                </p>
              </div>

              {/* Minimalist Feature List */}
              <div className="grid grid-cols-2 gap-x-12 gap-y-10">
                {features.map((feature, idx) => (
                  <div key={idx} className="group relative">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white group-hover:scale-110 transition-all duration-500 shadow-sm">
                        {feature.icon}
                      </div>
                      <h3 className="font-black text-white text-base uppercase tracking-tight">{feature.title}</h3>
                    </div>
                    <p className="text-slate-500 text-xs font-semibold leading-relaxed pl-14">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <span className="w-8 h-[1px] bg-slate-800" />
              &copy; 2026 Dreamlive Systems &bull; v{TokenStorage.VERSION || '1.0.0'}
            </div>
          </div>
        </div>
      )}

      {/* Panel derecho - Form Side */}
      <div className={`flex-1 flex items-center justify-center p-8 sm:p-12 lg:p-20 relative bg-slate-50`}>
        {/* Decorative soft glow */}
        <div className="absolute w-[500px] h-[500px] bg-indigo-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

        <div className={clsx("w-full relative z-10 transition-all duration-700 ease-out", maxWidth)}>
          <div className="bg-white/70 backdrop-blur-xl border border-white p-8 sm:p-12 rounded-[3rem] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.06)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * MobileLogo
 */
function MobileLogo() {
  return (
    <div className="flex items-center gap-4 mb-12 lg:hidden">
      <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/10">
        {Icons.bolt}
      </div>
      <div>
        <h1 className="text-slate-900 font-black text-2xl tracking-tighter">DREAM<span className="text-indigo-600">LIVE</span></h1>
        <p className="text-slate-400 text-[10px] font-black tracking-[0.2em] uppercase">Control System</p>
      </div>
    </div>
  );
}

/**
 * FormInput
 */
function FormInput({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2 px-1">
        <label className="block text-[10px] font-black text-slate-950 uppercase tracking-[0.2em] transition-colors">
          {label}
        </label>
        {error && <span className="text-rose-600 font-black text-[9px] uppercase tracking-widest animate-pulse">Invalido</span>}
      </div>
      <div className="relative group">
        <input
          {...props}
          className={clsx(
            "w-full px-5 py-4 rounded-2xl bg-slate-100/50 border text-slate-950 text-sm transition-all outline-none",
            "placeholder:text-slate-400 font-semibold",
            error
              ? 'border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/5'
              : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-8 focus:ring-indigo-500/[0.05] shadow-inner'
          )}
        />
        {/* Precision border effect */}
        <div className="absolute inset-0 rounded-2xl border-2 border-indigo-500/0 group-focus-within:border-indigo-500/10 pointer-events-none transition-all duration-500" />
      </div>
      {error && <p className="text-rose-500 font-bold text-[10px] mt-2 ml-1 italic">{error}</p>}
    </div>
  );
}

/**
 * SubmitButton
 */
function SubmitButton({ loading, children }: { loading?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={clsx(
        "w-full py-4.5 rounded-[1.25rem] font-black text-sm transition-all flex items-center justify-center gap-3 relative overflow-hidden group h-[60px]",
        "bg-slate-900 text-white hover:bg-indigo-600 disabled:opacity-50",
        "shadow-xl shadow-slate-900/10 hover:shadow-indigo-500/20 active:scale-95"
      )}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          <span className="relative z-10 uppercase tracking-[0.25em]">{children}</span>
          {/* Executive gloss effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
        </>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function LoginPage() {
  const { loginAgency, hasAgencyToken, selectProfile, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // State for Agency Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // State for Profile Selection
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [profilePassword, setProfilePassword] = useState('');

  // State for Profile Creation
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Fetch profiles if agency is logged in but user is not
  useEffect(() => {
    if (hasAgencyToken && !isAuthenticated) {
      setLoading(true);
      AuthAdapter.getAgencyProfiles()
        .then(setProfiles)
        .catch(() => {
          // Agency token is invalid or expired — clear it and show error
          TokenStorage.clear();
          setError('La sesión de agencia expiró. Inicia sesión nuevamente.');
        })
        .finally(() => setLoading(false));
    }
    // If fully authenticated, redirect to dashboard
    if (isAuthenticated) {
      navigate('/');
    }
  }, [hasAgencyToken, isAuthenticated, navigate]); // logout removed — not needed here

  // Handle Step 1 (Agency Login)
  const handleAgencyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginAgency(email, password, undefined); // Captcha ignored
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2 (Profile Selection + Password if needed)
  const handleProfileSelect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedProfile) return;
    setError('');
    setLoading(true);
    try {
      await selectProfile(selectedProfile.id, profilePassword.trim() !== '' ? profilePassword : undefined);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Contraseña de perfil incorrecta.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Profile Creation
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await AuthAdapter.createAgencyProfile(newUsername, newEmail, newPassword, 'agency_admin');
      const updatedProfiles = await AuthAdapter.getAgencyProfiles();
      setProfiles(updatedProfiles);
      setIsCreatingProfile(false);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Error al crear perfil.');
    } finally {
      setLoading(false);
    }
  };

  const getProfileBackgroundColor = (idx: number) => {
    const colors = [
      'from-blue-500 to-cyan-400',
      'from-violet-500 to-purple-500',
      'from-emerald-400 to-teal-500',
      'from-rose-400 to-red-500',
      'from-amber-400 to-orange-500'
    ];
    return colors[idx % colors.length];
  };

  if (hasAgencyToken && !isAuthenticated) {
    return (
      <AuthLayout showBranding={false} maxWidth="max-w-4xl">
        <div className="w-full mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-6">
              <i className="fas fa-lock mr-2" /> Sesión de Agencia Activa
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-950 tracking-tighter mb-4">Control de Acceso</h2>
            <p className="text-slate-600 font-medium max-w-sm mx-auto">Selecciona el perfil ejecutivo para gestionar tus operaciones.</p>
          </div>

          {!selectedProfile && profiles.length > 0 && !isCreatingProfile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12 py-4">
              {profiles.map((profile, idx) => (
                <div
                  key={profile.id}
                  className="group relative bg-white border border-slate-100 rounded-[2rem] p-8 cursor-pointer transition-all hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] hover:-translate-y-2 active:scale-95"
                  onClick={() => {
                    setError('');
                    if (profile.has_password) {
                      setSelectedProfile(profile);
                    } else {
                      // Login directly if no password
                      setSelectedProfile(profile);
                      setTimeout(() => handleProfileSelect(), 0);
                    }
                  }}
                >
                  <div className={`w-20 h-20 mb-8 rounded-[1.5rem] bg-gradient-to-br ${getProfileBackgroundColor(idx)} 
                    flex items-center justify-center text-white shadow-lg shadow-indigo-500/10 relative overflow-hidden`}>
                    <span className="text-3xl font-black">{profile.username.substring(0, 1).toUpperCase()}</span>
                    {profile.has_password && (
                      <div className="absolute top-2 right-2 bg-black/20 p-1 rounded-full">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xl font-black text-slate-950 tracking-tight group-hover:text-indigo-600 transition-colors uppercase">{profile.username}</h4>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{profile.role.replace('_', ' ')}</p>
                  </div>

                  <div className="mt-8 flex items-center justify-between">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Ingresar ahora</span>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <i className="fas fa-arrow-right text-xs" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : isCreatingProfile || profiles.length === 0 ? (
            <div className="max-w-md mx-auto text-left animate-in fade-in zoom-in-95 duration-500">
              <div className="mb-10 flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                  <i className="fas fa-user-plus" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-950 tracking-tighter">Crear Ejecutivo</h3>
                  <p className="text-xs text-slate-500 font-semibold mb-0">Define un nuevo acceso administrativo.</p>
                </div>
              </div>

              <form onSubmit={handleCreateProfile}>
                <FormInput
                  label="Nombre de Usuario"
                  type="text"
                  placeholder="Ej: Director Regional"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  required
                />
                <FormInput
                  label="Correo Electrónico"
                  type="email"
                  placeholder="admin@dreamlive.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  required
                />
                <FormInput
                  label="Contraseña de Acceso"
                  type="password"
                  placeholder="Crea un PIN o clave"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
                {error && (
                  <div className="mb-6 px-5 py-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold">
                    <i className="fas fa-exclamation-circle mr-2" /> {error}
                  </div>
                )}
                <div className="flex gap-4">
                  {profiles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingProfile(false)}
                      className="flex-1 py-4.5 rounded-2xl bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 active:scale-95 transition-all"
                    >
                      Volver
                    </button>
                  )}
                  <div className="flex-1">
                    <SubmitButton loading={loading}>Crear Perfil</SubmitButton>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="max-w-md mx-auto text-center animate-in fade-in zoom-in duration-500">
              <div className={`w-28 h-28 mx-auto mb-8 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-blue-600 
                    flex items-center justify-center text-white shadow-[0_20px_40px_-10px_rgba(79,70,229,0.3)] ring-8 ring-white`}>
                <span className="text-5xl font-black">{selectedProfile.username.substring(0, 1).toUpperCase()}</span>
              </div>
              <h3 className="text-3xl font-black text-slate-950 tracking-tighter mb-2">Hola de nuevo, {selectedProfile.username}</h3>
              <p className="text-slate-600 font-medium mb-10 italic">Se requiere tu PIN de seguridad para ingresar.</p>

              <form onSubmit={handleProfileSelect} className="text-left">
                <FormInput
                  label="PIN de Acceso"
                  type="password"
                  placeholder="••••••"
                  value={profilePassword}
                  onChange={e => setProfilePassword(e.target.value)}
                  required
                  autoFocus
                />
                {error && (
                  <div className="mb-6 px-5 py-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold">
                    <i className="fas fa-exclamation-circle mr-2" /> {error}
                  </div>
                )}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => { setSelectedProfile(null); setProfilePassword(''); setError(''); }}
                    className="flex-1 py-4.5 rounded-2xl bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 active:scale-95 transition-all"
                  >
                    Cambiar
                  </button>
                  <div className="flex-1">
                    <SubmitButton loading={loading}>Verificar</SubmitButton>
                  </div>
                </div>
              </form>
            </div>
          )}

          <div className="text-center mt-12 pt-8 border-t border-slate-100">
            <button
              onClick={() => logout()}
              className="text-slate-400 hover:text-slate-600 font-medium text-sm transition-colors"
            >
              Iniciar con otra agencia
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <MobileLogo />

      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Bienvenido de vuelta</h2>
        <p className="text-slate-600 font-medium">Ingresa tus credenciales de Agencia para acceder</p>
      </div>

      <form onSubmit={handleAgencyLogin}>
        <FormInput
          label="Correo electrónico"
          type="email"
          placeholder="correo@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <FormInput
          label="Contraseña"
          type="password"
          placeholder="Ingresa tu contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        {error && (
          <div className="mb-6 px-5 py-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold">
            <i className="fas fa-exclamation-circle mr-2" /> {error}
          </div>
        )}

        <SubmitButton loading={loading}>Continuar</SubmitButton>
      </form>

    </AuthLayout>
  );
}

// -- Removed AdminLoginPage

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function RegisterPage() {
  const { register: doRegister } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '', username: '', password: '', confirm: '',
    full_name: '', role: 'agent',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Las contrasenas no coinciden.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await doRegister({
        email: form.email,
        username: form.username,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Error al registrar.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout showBranding={false}>
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white">
              {Icons.check}
            </div>
          </div>
          <h2 className="text-white font-bold text-2xl mb-3">Registro exitoso</h2>
          <p className="text-slate-400 mb-8 max-w-sm mx-auto">
            Tu cuenta está pendiente de activación por un administrador. Te notificaremos cuando esté lista.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            {Icons.arrowLeft}
            Volver al login
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <MobileLogo />

      <div className="mb-8 text-center sm:text-left">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Nueva Cuenta</h2>
        <p className="text-slate-400 font-medium">Únete a la red de agencias de alto rendimiento.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Nombre completo"
            placeholder="Juan Perez"
            value={form.full_name}
            onChange={set('full_name')}
          />
          <FormInput
            label="Usuario"
            placeholder="juanperez"
            value={form.username}
            onChange={set('username')}
            required
          />
        </div>

        <FormInput
          label="Correo electronico"
          type="email"
          placeholder="tu@email.com"
          value={form.email}
          onChange={set('email')}
          required
        />

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2 px-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Rol Corporativo
            </label>
          </div>
          <select
            value={form.role}
            onChange={set('role')}
            className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white focus:ring-8 focus:ring-indigo-500/[0.03] transition-all"
          >
            <option value="agent">Agente Ejecutivo</option>
            <option value="owner">Propietario / CEO</option>
            <option value="admin">Administrador TI</option>
            <option value="programmer">Desarrollador</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Contrasena"
            type="password"
            placeholder="Min. 8 caracteres"
            value={form.password}
            onChange={set('password')}
            required
          />
          <FormInput
            label="Confirmar"
            type="password"
            placeholder="Repetir contrasena"
            value={form.confirm}
            onChange={set('confirm')}
            required
          />
        </div>

        {error && (
          <div className="mb-6 px-5 py-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold">
            <i className="fas fa-exclamation-circle mr-2" /> {error}
          </div>
        )}

        <SubmitButton loading={loading}>Crear cuenta</SubmitButton>
      </form>

      <div className="mt-10 pt-8 border-t border-slate-100 text-center sm:text-left">
        <p className="text-slate-400 text-xs font-medium">
          ¿Ya tienes acceso?{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-black uppercase tracking-widest text-[10px] ml-2">
            Iniciar Sesión
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECOVER PASSWORD PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function RecoverPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout showBranding={false}>
      <MobileLogo />

      <div className="mb-10 text-center sm:text-left">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-3">Recuperación</h2>
        <p className="text-slate-400 font-medium leading-relaxed">
          Ingresa tu identidad corporativa para recibir instrucciones de acceso.
        </p>
      </div>

      {sent ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
            {Icons.mail}
          </div>
          <h3 className="text-slate-900 font-bold text-lg mb-2">Revisa tu correo</h3>
          <p className="text-slate-500 text-sm mb-6">
            Si el correo existe en nuestro sistema, recibiras instrucciones en los proximos minutos.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors"
          >
            {Icons.arrowLeft}
            Volver al login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Correo electronico"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <SubmitButton loading={loading}>Enviar instrucciones</SubmitButton>
        </form>
      )}

      {!sent && (
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
          >
            {Icons.arrowLeft}
            Volver al login
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD PAGE (con token de URL)
// ─────────────────────────────────────────────────────────────────────────────
export function ResetPasswordPage() {
  const { confirmPasswordReset } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Las contrasenas no coinciden.'); return; }
    if (!token) { setError('Token invalido.'); return; }
    setLoading(true);
    try {
      await confirmPasswordReset(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Token invalido o expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout showBranding={false}>
      <MobileLogo />

      <div className="mb-10 text-center sm:text-left">
        <h2 className="text-4xl font-black text-slate-950 tracking-tighter mb-3">Identificación</h2>
        <p className="text-slate-600 font-medium leading-relaxed">Acceso restringido para personal de Agencias DreamLive.</p>
      </div>

      {success ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
            {Icons.check}
          </div>
          <h3 className="text-slate-900 font-bold text-lg mb-2">Contrasena actualizada</h3>
          <p className="text-slate-500 text-sm">Redirigiendo al login...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Nueva contrasena"
            type="password"
            placeholder="Min. 8 caracteres"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <FormInput
            label="Confirmar contrasena"
            type="password"
            placeholder="Repetir contrasena"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />

          {error && (
            <div className="mb-6 px-5 py-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold">
              <i className="fas fa-exclamation-circle mr-2" /> {error}
            </div>
          )}

          <SubmitButton loading={loading}>Actualizar contrasena</SubmitButton>
        </form>
      )}
    </AuthLayout>
  );
}
