import { AuthScreen } from '@/features/auth';
import { AuthProvider, useAuthContext } from '@/features/auth/context/AuthContext';
import { Dashboard } from '@/features/dashboard/components/Dashboard';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import './App.css';

/**
 * Componente interno que consume el contexto de autenticación
 */
const AppContent = () => {
  const { status, user, license, logout } = useAuthContext();

  return (
    <div className="w-full min-h-[550px] flex flex-col transition-colors duration-300">
      {status === 'authenticated' ? (
        <Dashboard />
      ) : (
        <AuthScreen />
      )}
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
