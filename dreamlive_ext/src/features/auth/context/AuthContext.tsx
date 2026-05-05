import { createContext, useContext, useState, useCallback, useEffect, ReactNode, FC } from 'react';
import { AuthService, User, License } from '../../../infrastructure/api/auth.service';
import { socketService } from '../../../infrastructure/websocket/socket.service';

export type AuthStatus =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'needs_license'
  | 'needs_user_registration'
  | 'error';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  license: License | null;
  token: string | null;
  session_id: string | null;
  error: string | null;
  limitReachedInfo?: { active: number, max: number } | null;
}

interface AuthContextType extends AuthState {
  loginWithEmail: (email: string, pass: string, force?: boolean) => Promise<void>;
  loginWithLicense: (licenseKey: string, force?: boolean) => Promise<void>;
  handleLinkLicense: (licenseKey: string, email: string, pass: string, fullName: string, force?: boolean) => Promise<void>;
  handleCreateAdmin: (formData: any) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const WS_URL = import.meta.env.WXT_WS_URL || 'wss://api.dreamlive.app/api/v2/extension/chat/ws';

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    status: 'idle',
    user: null,
    license: null,
    token: null,
    session_id: null,
    error: null,
  });

  const clearSession = async () => {
    await storage.removeItem('local:token');
    await storage.removeItem('local:user');
    await storage.removeItem('local:license');
    await storage.removeItem('local:session_id');
    socketService.disconnect();
  };

  const handleForceLogout = useCallback(async (reason: string) => {
    await clearSession();
    setState({
      status: 'error',
      user: null,
      license: null,
      token: null,
      session_id: null,
      error: reason
    });
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = await storage.getItem<string>('local:token');
      const savedUser = await storage.getItem<User>('local:user');
      const savedLicense = await storage.getItem<License>('local:license');
      const savedSessionId = await storage.getItem<string>('local:session_id');

      if (savedToken) {
        setState({
          status: 'authenticated',
          user: savedUser,
          license: savedLicense,
          token: savedToken,
          session_id: savedSessionId,
          error: null
        });
        socketService.connect(WS_URL, savedToken, savedSessionId || undefined);
      }
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (state.status === 'authenticated' && state.token) {
      // 1. Manejar cierres forzados desde el servidor
      const unsubForce = socketService.on('FORCE_LOGOUT', (payload) => {
        handleForceLogout(payload.reason || 'Sesión cerrada por seguridad.');
      });

      // 2. Manejar errores de conexión (ej: Token expirado en el handshake)
      const unsubError = socketService.on('CONNECTION_ERROR', async () => {
        console.warn('[AUTH] Error detectado en WS, verificando integridad de sesión...');

        // Intentar una petición simple para ver si el token sirve o se puede refrescar
        const { error } = await AuthService.getMe();

        if (error) {
          console.error('[AUTH] Sesión inválida o expirada definitivamente:', error);
          handleForceLogout('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
        } else {
          // Si el token se refrescó exitosamente en la petición anterior,
          // reintentamos conectar el socket con los nuevos datos
          const newToken = await storage.getItem<string>('local:token');
          const sid = await storage.getItem<string>('local:session_id');
          if (newToken) {
            console.log('[AUTH] Token renovado, reintentando WebSocket...');
            socketService.connect(WS_URL, newToken, sid || undefined);
          }
        }
      });

      return () => {
        unsubForce();
        unsubError();
      };
    }
  }, [state.status, state.token, handleForceLogout]);

  const loginWithEmail = async (email: string, pass: string, force: boolean = false) => {
    setState((prev) => ({ ...prev, status: 'loading', error: null, limitReachedInfo: null }));
    const { data: tokenData, error: loginError } = await AuthService.loginExtension(email, pass, force);

    if (loginError) {
      if (typeof loginError === 'object' && (loginError as any).code === 'LIMIT_REACHED') {
        setState((prev) => ({ 
          ...prev, 
          status: 'error', 
          error: (loginError as any).message,
          limitReachedInfo: { active: (loginError as any).active, max: (loginError as any).max }
        }));
      } else {
        const errStr = typeof loginError === 'string' ? loginError : 'Error desconocido';
        const lowerError = errStr.toLowerCase();
        if (lowerError.includes("no encontrada") || lowerError.includes("licensenotfound") || lowerError.includes("no encontrado")) {
          setState((prev) => ({ ...prev, status: 'needs_license', error: null }));
        } else {
          setState((prev) => ({ ...prev, status: 'error', error: errStr }));
        }
      }
      return;
    }

    if (tokenData) {
      await storage.setItem('local:token', tokenData.token);
      await storage.setItem('local:license', tokenData.license);
      await storage.setItem('local:session_id', tokenData.session_id);

      setState({
        status: 'authenticated',
        user: null,
        license: tokenData.license,
        token: tokenData.token,
        session_id: tokenData.session_id,
        error: null,
        limitReachedInfo: null
      });
      socketService.connect(WS_URL, tokenData.token, tokenData.session_id);
    }
  };

  const loginWithLicense = async (licenseKey: string, force: boolean = false) => {
    setState((prev) => ({ ...prev, status: 'loading', error: null, limitReachedInfo: null }));
    const { data, error } = await AuthService.loginWithLicense(licenseKey, force);

    if (error) {
      if (typeof error === 'object' && (error as any).code === 'LIMIT_REACHED') {
        setState((prev) => ({ 
          ...prev, 
          status: 'error', 
          error: (error as any).message,
          limitReachedInfo: { active: (error as any).active, max: (error as any).max }
        }));
      } else {
        setState((prev) => ({ ...prev, status: 'error', error: typeof error === 'string' ? error : 'Error desconocido' }));
      }
      return;
    }

    if (data) {
      if (data.hasAdminUser) {
        await storage.setItem('local:token', data.token);
        await storage.setItem('local:license', data.license);
        await storage.setItem('local:session_id', data.session_id);
        setState({
          status: 'authenticated',
          user: null,
          license: data.license,
          token: data.token,
          session_id: data.session_id,
          error: null,
          limitReachedInfo: null
        });
        socketService.connect(WS_URL, data.token, data.session_id);
      } else {
        setState({
          status: 'needs_user_registration',
          user: null,
          license: data.license,
          token: data.token,
          session_id: data.session_id,
          error: null,
          limitReachedInfo: null
        });
      }
    }
  };

  const handleLinkLicense = async (licenseKey: string, email: string, pass: string, fullName: string, force: boolean = false) => {
    setState((prev) => ({ ...prev, status: 'loading', error: null, limitReachedInfo: null }));
    const { data, error } = await AuthService.linkLicense({ licenseKey, email, password: pass, fullName, force });

    if (error) {
      if (typeof error === 'object' && (error as any).code === 'LIMIT_REACHED') {
        setState((prev) => ({ 
          ...prev, 
          status: 'error', 
          error: (error as any).message,
          limitReachedInfo: { active: (error as any).active, max: (error as any).max }
        }));
      } else {
        setState((prev) => ({ ...prev, status: 'needs_license', error: typeof error === 'string' ? error : 'Error desconocido' }));
      }
    } else if (data) {
      await storage.setItem('local:token', data.token);
      await storage.setItem('local:license', data.license);
      await storage.setItem('local:session_id', data.session_id);
      setState({ ...state, status: 'authenticated', license: data.license, token: data.token, session_id: data.session_id, error: null, limitReachedInfo: null });
      socketService.connect(WS_URL, data.token, data.session_id || undefined);
    }
  };

  const handleCreateAdmin = async (formData: any) => {
    if (!state.license || !state.token) return;
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    const { data, error } = await AuthService.linkLicense({
      licenseKey: state.license.key,
      email: formData.email,
      password: formData.password,
      fullName: formData.username
    });

    if (error) {
      setState((prev) => ({ ...prev, status: 'needs_user_registration', error }));
    } else if (data) {
      await storage.setItem('local:token', data.token);
      await storage.setItem('local:license', data.license);
      await storage.setItem('local:session_id', data.session_id);

      setState({ ...state, status: 'authenticated', license: data.license, token: data.token, session_id: data.session_id, error: null });
      socketService.connect(WS_URL, data.token, data.session_id || undefined);
    }
  };

  const logout = async () => {
    await clearSession();
    setState({ status: 'idle', user: null, license: null, token: null, session_id: null, error: null });
  };

  const logoutAll = async () => {
    setState((prev) => ({ ...prev, status: 'loading' }));
    try {
      await AuthService.logoutAll();
    } catch (e) {
      console.error(e);
    } finally {
      await logout();
    }
  };

  const clearError = () => {
    setState((prev) => ({ ...prev, error: null, status: prev.status === 'error' ? 'idle' : prev.status }));
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      loginWithEmail,
      loginWithLicense,
      handleLinkLicense,
      handleCreateAdmin,
      logout,
      logoutAll,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
