/**
 * ThemeContext.tsx
 * 
 * Gestiona el tema de la aplicación (claro/oscuro), persistiendo la 
 * preferencia en localStorage y sincronizando con la clase .dark de Tailwind.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * ThemeProvider
 * 
 * Provee el estado del tema a la aplicación y aplica la clase .dark al 
 * elemento raíz (document.documentElement).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Inicializar desde localStorage o preferencia del sistema
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('dl_theme') as Theme;
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('dl_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * useTheme
 * 
 * Hook para consumir el contexto de tema.
 * @returns {ThemeContextType} - Estado y acciones del tema.
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
}
