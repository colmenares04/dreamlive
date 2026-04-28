/**
 * contexts/index.ts
 *
 * Barrel para exponer contextos de la aplicación desde una ruta clara
 * (`./contexts`). Facilita reorganizaciones posteriores y hace los
 * imports más declarativos:
 *
 * import { AuthProvider, useAuth, NotificationProvider } from './contexts'
 */

export { AuthProvider, useAuth } from './AuthContext';
export { NotificationProvider, useNotifications } from './NotificationContext';
export { ThemeProvider, useTheme } from './ThemeContext';
export { SocketProvider, useSocket } from './SocketContext';
