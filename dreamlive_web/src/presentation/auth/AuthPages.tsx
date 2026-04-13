/**
 * Paginas de autenticacion:
 *   LoginPage, RegisterPage, RecoverPasswordPage, ResetPasswordPage
 */
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../infrastructure/context/AuthContext';
import { CaptchaBox } from '../../infrastructure/hooks/useCaptcha';

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
    title: 'Gestion de Leads',
    description: 'Captura y gestiona leads de forma automatizada',
  },
  {
    icon: Icons.chart,
    title: 'Estadisticas en Tiempo Real',
    description: 'Monitorea el rendimiento de tu equipo',
  },
  {
    icon: Icons.shield,
    title: 'Seguridad Avanzada',
    description: 'Proteccion de datos y licencias seguras',
  },
  {
    icon: Icons.rocket,
    title: 'Automatizacion Total',
    description: 'Optimiza tu flujo de trabajo con IA',
  },
];

const stats = [
  { value: '10K+', label: 'Leads Generados' },
  { value: '500+', label: 'Agencias Activas' },
  { value: '99.9%', label: 'Uptime' },
];

// ── Componentes auxiliares ─────────────────────────────────────────────────
function AuthLayout({ children, showBranding = true }: { children: React.ReactNode; showBranding?: boolean }) {
  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo - Branding */}
      {showBranding && (
        <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-slate-950 relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" />
            <div className="absolute bottom-40 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-600/5 to-cyan-600/5 rounded-full blur-3xl" />
          </div>

          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }} />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                {Icons.bolt}
              </div>
              <div>
                <h1 className="text-white font-black text-2xl tracking-tight">DREAMLIVE</h1>
                <p className="text-slate-500 text-xs font-medium tracking-[0.2em] uppercase">Platform</p>
              </div>
            </div>

            {/* Main Content */}
            <div className="space-y-12">
              <div>
                <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight text-balance">
                  La plataforma completa para{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                    gestionar tu agencia
                  </span>
                </h2>
                <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-lg">
                  Automatiza la captacion de leads, gestiona tu equipo y escala tu negocio con herramientas profesionales.
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-4">
                {features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3 group-hover:bg-blue-500/20 transition-colors">
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold text-white text-sm mb-1">{feature.title}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-12">
              {stats.map((stat, idx) => (
                <div key={idx}>
                  <p className="text-3xl font-black text-white">{stat.value}</p>
                  <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Panel derecho - Form */}
      <div className={`flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white ${!showBranding ? 'w-full' : ''}`}>
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}

function MobileLogo() {
  return (
    <div className="flex items-center gap-3 mb-8 lg:hidden">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div>
        <h1 className="text-slate-900 font-black text-xl tracking-tight">DREAMLIVE</h1>
        <p className="text-slate-400 text-xs font-medium tracking-[0.15em] uppercase">Platform</p>
      </div>
    </div>
  );
}

function FormInput({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <input
        {...props}
        className={`w-full px-4 py-3 rounded-xl bg-slate-50 border text-slate-900 text-sm
          placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:bg-white
          ${error
            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
            : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20'
          }`}
      />
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
}

function SubmitButton({ loading, children }: { loading?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50
        text-white font-semibold text-sm transition-all flex items-center justify-center gap-2.5
        shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-slate-900/20"
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, captchaToken || undefined);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Error al iniciar sesion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <MobileLogo />
      
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Bienvenido de vuelta</h2>
        <p className="text-slate-500">Ingresa tus credenciales para acceder a tu cuenta</p>
      </div>

      <form onSubmit={handleSubmit}>
        <FormInput
          label="Correo electronico"
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <FormInput
          label="Contrasena"
          type="password"
          placeholder="Ingresa tu contrasena"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* reCAPTCHA v2 */}
        <div className="mb-4">
          <CaptchaBox onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} />
        </div>

        <SubmitButton loading={loading}>Iniciar Sesion</SubmitButton>
      </form>

      <div className="mt-6 text-center">
        <Link to="/recover" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
          Olvidaste tu contrasena?
        </Link>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100">
        <p className="text-center text-slate-500 text-sm">
          No tienes cuenta?{' '}
          <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
            Crear cuenta
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

// ── Admin Icons ────────────────────────────────────────────────────────────
const AdminIcons = {
  shield: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  lock: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
  key: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
  ),
  fingerprint: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33" />
    </svg>
  ),
  server: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
    </svg>
  ),
  activity: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  database: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  ),
};

// ── Admin Features ─────────────────────────────────────────────────────────
const adminFeatures = [
  {
    icon: AdminIcons.users,
    title: 'Gestion de Usuarios',
    description: 'Control total sobre agencias y operadores',
  },
  {
    icon: AdminIcons.key,
    title: 'Sistema de Licencias',
    description: 'Administra y genera licencias de acceso',
  },
  {
    icon: AdminIcons.activity,
    title: 'Monitoreo en Vivo',
    description: 'Estadisticas y metricas en tiempo real',
  },
  {
    icon: AdminIcons.database,
    title: 'Control de Datos',
    description: 'Acceso completo a la base de datos',
  },
];

const adminStats = [
  { value: '256-bit', label: 'Encriptacion' },
  { value: '2FA', label: 'Autenticacion' },
  { value: '24/7', label: 'Monitoreo' },
];

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN LOGIN PAGE (Private - No link from regular login)
// ─────────────────────────────────────────────────────────────────────────────
export function AdminLoginPage() {
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginAdmin(email, password, captchaToken || undefined);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Error al iniciar sesion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[hsl(220,25%,6%)]">
      {/* Panel izquierdo - Branding Admin */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/50 via-[hsl(220,25%,6%)] to-purple-950/30" />
        
        {/* Animated Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-fuchsia-500/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '4s' }} />
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />

        {/* Diagonal Lines */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 100px,
            rgba(139,92,246,0.1) 100px,
            rgba(139,92,246,0.1) 101px
          )`
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-violet-500/30 ring-1 ring-white/10">
              {AdminIcons.shield}
            </div>
            <div>
              <h1 className="text-white font-black text-2xl tracking-tight">DREAMLIVE</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 text-[10px] font-bold tracking-wider uppercase border border-violet-500/20">
                  Admin
                </span>
                <span className="text-slate-500 text-xs font-medium">v2.0</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-violet-300 text-xs font-semibold tracking-wide">Area Restringida</span>
              </div>
              <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight text-balance">
                Centro de{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400">
                  Control Administrativo
                </span>
              </h2>
              <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-lg">
                Acceso exclusivo para superusuarios. Gestiona licencias, agencias, y monitorea toda la actividad de la plataforma.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              {adminFeatures.map((feature, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white/[0.02] border border-violet-500/10 hover:bg-violet-500/5 hover:border-violet-500/20 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/10 text-violet-400 flex items-center justify-center mb-3 group-hover:from-violet-500/30 group-hover:to-purple-500/20 transition-colors ring-1 ring-violet-500/20">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-1">{feature.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Security Stats */}
          <div className="flex items-center gap-8">
            {adminStats.map((stat, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center ring-1 ring-violet-500/20">
                  {idx === 0 && AdminIcons.lock}
                  {idx === 1 && AdminIcons.fingerprint}
                  {idx === 2 && AdminIcons.server}
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 relative">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
              {AdminIcons.shield}
            </div>
            <div>
              <h1 className="text-white font-black text-xl tracking-tight">DREAMLIVE</h1>
              <span className="px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 text-[10px] font-bold tracking-wider uppercase">
                Admin Console
              </span>
            </div>
          </div>

          {/* Card */}
          <div className="bg-[hsl(220,20%,10%)] border border-violet-500/10 rounded-2xl p-8 shadow-2xl shadow-black/50 ring-1 ring-white/5">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-500/20 to-purple-500/10 rounded-2xl flex items-center justify-center ring-1 ring-violet-500/20">
                <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <h2 className="text-white font-bold text-xl mb-2">Acceso Administrativo</h2>
              <p className="text-slate-500 text-sm">Ingresa tus credenciales de superusuario</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Correo electronico
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="admin@dreamlive.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 pl-11 rounded-xl bg-[hsl(220,20%,8%)] border border-violet-500/10 text-white text-sm
                      placeholder-slate-600 transition-all focus:outline-none focus:ring-2 focus:border-violet-500/50 focus:ring-violet-500/20
                      hover:border-violet-500/20"
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Contrasena
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Ingresa tu contrasena"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 pl-11 rounded-xl bg-[hsl(220,20%,8%)] border border-violet-500/10 text-white text-sm
                      placeholder-slate-600 transition-all focus:outline-none focus:ring-2 focus:border-violet-500/50 focus:ring-violet-500/20
                      hover:border-violet-500/20"
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              <div>
                <CaptchaBox onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-violet-600 hover:from-violet-500 hover:via-purple-500 hover:to-violet-500 
                  disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all flex items-center justify-center gap-2.5
                  shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/40 bg-[length:200%_100%] hover:bg-right"
                style={{ transition: 'all 0.3s ease, background-position 0.5s ease' }}
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    Acceder al Panel
                  </>
                )}
              </button>
            </form>

            {/* Security Badge */}
            <div className="mt-6 pt-6 border-t border-violet-500/10">
              <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
                <svg className="w-4 h-4 text-violet-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <span>Conexion segura SSL/TLS</span>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-8 text-center">
            <p className="text-slate-600 text-xs leading-relaxed">
              Este es un area de acceso restringido. Todas las actividades son<br />
              monitoreadas y registradas por motivos de seguridad.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

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
          <h2 className="text-slate-900 font-bold text-2xl mb-3">Registro exitoso</h2>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto">
            Tu cuenta esta pendiente de activacion por un administrador. Te notificaremos cuando este lista.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors"
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

      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Crear cuenta</h2>
        <p className="text-slate-500">Completa tus datos para registrarte en la plataforma</p>
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

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Rol
          </label>
          <select
            value={form.role}
            onChange={set('role')}
            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200
              text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
          >
            <option value="agent">Agente</option>
            <option value="owner">Propietario</option>
            <option value="admin">Administrador</option>
            <option value="programmer">Programador</option>
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
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
            {error}
          </div>
        )}

        <SubmitButton loading={loading}>Crear cuenta</SubmitButton>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-100">
        <p className="text-center text-slate-500 text-sm">
          Ya tienes cuenta?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
            Iniciar sesion
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

      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Recuperar contrasena</h2>
        <p className="text-slate-500">
          Ingresa tu correo y te enviaremos instrucciones para restablecer tu contrasena.
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

      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Nueva contrasena</h2>
        <p className="text-slate-500">Elige una contrasena segura para tu cuenta.</p>
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
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
              {error}
            </div>
          )}

          <SubmitButton loading={loading}>Actualizar contrasena</SubmitButton>
        </form>
      )}
    </AuthLayout>
  );
}
