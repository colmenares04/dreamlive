import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isExtensionPopup = typeof window !== 'undefined' && window.location.protocol.includes('-extension:');

  const [theme, setTheme] = useState<Theme>(() => {
    if (isExtensionPopup) {
      const savedTheme = localStorage.getItem('dreamlive_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    }
    return 'light';
  });

  useEffect(() => {
    if (isExtensionPopup) {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      localStorage.setItem('dreamlive_theme', theme);
    }
  }, [theme, isExtensionPopup]);

  // Sincronización para Content Scripts (fuera del popup)
  useEffect(() => {
    if (!isExtensionPopup) {
      const syncFromStorage = async () => {
        const res = await browser.storage.local.get('theme');
        if (res.theme === 'dark' || res.theme === 'light') {
          setTheme(res.theme);
        }
      };
      syncFromStorage();

      const handleStorageChange = (changes: any, area: string) => {
        if (area === 'local' && changes.theme) {
          setTheme(changes.theme.newValue);
        }
      };
      browser.storage.onChanged.addListener(handleStorageChange);
      return () => browser.storage.onChanged.removeListener(handleStorageChange);
    }
  }, [isExtensionPopup]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    // Si estamos en el popup, el useEffect de arriba guardará en localStorage y clase.
    // Si estamos en un content script (aunque toggleTheme no debería llamarse desde ahí normalmente),
    // deberíamos guardar en storage.
    if (!isExtensionPopup) {
      browser.storage.local.set({ theme: newTheme });
    } else {
      browser.storage.local.set({ theme: newTheme });
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
