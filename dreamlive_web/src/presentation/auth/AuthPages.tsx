/**
 * Páginas de autenticación:
 *   LoginPage, RegisterPage, RecoverPasswordPage, ResetPasswordPage
 */
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../infrastructure/context/AuthContext';
import { CaptchaBox } from '../../infrastructure/hooks/useCaptcha';

// ── Componentes auxiliares ─────────────────────────────────────────────────────
function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Fondo con mesh gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
      {children}
    </div>
  );
}

function AuthLogo() {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div>
        <h1 className="text-white font-black text-xl tracking-tight leading-none">DREAMLIVE</h1>
        <p className="text-slate-500 text-xs font-medium tracking-widest uppercase">Console</p>
      </div>
    </div>
  );
}

function FormInput({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        {...props}
        className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border text-white text-sm
          placeholder-slate-500 transition-all focus:outline-none focus:ring-2
          ${error
            ? 'border-red-500/60 focus:ring-red-500/30'
            : 'border-slate-700 focus:border-sky-500 focus:ring-sky-500/20'
          }`}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

function SubmitButton({ loading, children }: { loading?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50
        text-white font-bold text-sm transition-all mt-2 flex items-center justify-center gap-2"
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
      setError(err.response?.data?.detail ?? 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        <AuthLogo />
        <h2 className="text-white font-bold text-2xl mb-1">Bienvenido</h2>
        <p className="text-slate-500 text-sm mb-6">Ingresa tus credenciales para continuar</p>

        <form onSubmit={handleSubmit}>
          <FormInput
            label="Email" type="email" placeholder="tu@email.com"
            value={email} onChange={e => setEmail(e.target.value)} required
          />
          <FormInput
            label="Contraseña" type="password" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)} required
          />

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20
              text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* reCAPTCHA v2 */}
          <CaptchaBox onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} />

          <SubmitButton loading={loading}>Iniciar Sesión</SubmitButton>
        </form>

        <div className="mt-6 flex flex-col gap-2 text-center text-sm">
          <Link to="/recover" className="text-sky-400 hover:text-sky-300 transition-colors">
            ¿Olvidaste tu contraseña?
          </Link>
          <span className="text-slate-600">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-sky-400 hover:text-sky-300">
              Regístrate
            </Link>
          </span>
          <Link to="/console-login" className="text-sky-400 hover:text-sky-300 text-sm">
            ¿Eres superusuario? Inicia sesión aquí
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}

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
      setError(err.response?.data?.detail ?? 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        <AuthLogo />
        <h2 className="text-white font-bold text-2xl mb-1">Login Superusuario</h2>
        <p className="text-slate-500 text-sm mb-6">Conéctate desde la ruta de administrador</p>

        <form onSubmit={handleSubmit}>
          <FormInput
            label="Email" type="email" placeholder="admin@dreamlive.com"
            value={email} onChange={e => setEmail(e.target.value)} required
          />
          <FormInput
            label="Contraseña" type="password" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)} required
          />

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20
              text-red-400 text-sm">
              {error}
            </div>
          )}

          <CaptchaBox onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} />

          <SubmitButton loading={loading}>Iniciar Sesión</SubmitButton>
        </form>

        <div className="mt-6 flex flex-col gap-2 text-center text-sm">
          <Link to="/recover" className="text-sky-400 hover:text-sky-300 transition-colors">
            ¿Olvidaste tu contraseña?
          </Link>
          <span className="text-slate-600">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-sky-400 hover:text-sky-300">
              Regístrate
            </Link>
          </span>
          <Link to="/login" className="text-sky-400 hover:text-sky-300 text-sm">
            Volver al login de agencia
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
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
      setError('Las contraseñas no coinciden.');
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
      <AuthLayout>
        <AuthCard>
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-white font-bold text-xl mb-2">¡Registro exitoso!</h2>
            <p className="text-slate-400 text-sm mb-6">
              Tu cuenta está pendiente de activación por un administrador.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="text-sky-400 hover:text-sky-300 text-sm font-semibold"
            >
              ← Volver al login
            </button>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard>
        <AuthLogo />
        <h2 className="text-white font-bold text-2xl mb-1">Crear Cuenta</h2>
        <p className="text-slate-500 text-sm mb-6">Completa los datos para registrarte</p>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Nombre Completo" placeholder="Juan Pérez"
              value={form.full_name} onChange={set('full_name')} />
            <FormInput label="Usuario" placeholder="juanperez"
              value={form.username} onChange={set('username')} required />
          </div>
          <FormInput label="Email" type="email" placeholder="tu@email.com"
            value={form.email} onChange={set('email')} required />

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Rol
            </label>
            <select
              value={form.role}
              onChange={set('role')}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700
                text-white text-sm focus:outline-none focus:border-sky-500"
            >
              <option value="agent">Agente</option>
              <option value="owner">Propietario</option>
              <option value="admin">Administrador</option>
              <option value="programmer">Programador</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Contraseña" type="password" placeholder="••••••••"
              value={form.password} onChange={set('password')} required />
            <FormInput label="Confirmar" type="password" placeholder="••••••••"
              value={form.confirm} onChange={set('confirm')} required />
          </div>

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <SubmitButton loading={loading}>Crear Cuenta</SubmitButton>
        </form>

        <p className="text-center text-slate-500 text-sm mt-4">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-sky-400 hover:text-sky-300">Inicia sesión</Link>
        </p>
      </AuthCard>
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
    <AuthLayout>
      <AuthCard>
        <AuthLogo />
        <h2 className="text-white font-bold text-2xl mb-1">Recuperar Contraseña</h2>
        <p className="text-slate-500 text-sm mb-6">
          Te enviaremos un enlace para restablecer tu contraseña.
        </p>

        {sent ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-white font-semibold mb-1">Revisa tu email</p>
            <p className="text-slate-400 text-sm">
              Si el correo existe, recibirás instrucciones en los próximos minutos.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <FormInput label="Email" type="email" placeholder="tu@email.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
            <SubmitButton loading={loading}>Enviar enlace</SubmitButton>
          </form>
        )}

        <p className="text-center mt-4">
          <Link to="/login" className="text-sky-400 hover:text-sky-300 text-sm">
            ← Volver al login
          </Link>
        </p>
      </AuthCard>
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
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    if (!token) { setError('Token inválido.'); return; }
    setLoading(true);
    try {
      await confirmPasswordReset(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Token inválido o expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        <AuthLogo />
        <h2 className="text-white font-bold text-2xl mb-1">Nueva Contraseña</h2>
        <p className="text-slate-500 text-sm mb-6">Elige una contraseña segura.</p>

        {success ? (
          <p className="text-teal-400 text-sm text-center font-semibold">
            ✓ Contraseña actualizada. Redirigiendo...
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <FormInput label="Nueva contraseña" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required />
            <FormInput label="Confirmar contraseña" type="password" placeholder="••••••••"
              value={confirm} onChange={e => setConfirm(e.target.value)} required />
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <SubmitButton loading={loading}>Actualizar Contraseña</SubmitButton>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
