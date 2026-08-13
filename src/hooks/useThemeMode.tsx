import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeMode = 'teal' | 'blue' | 'midnight';

export const THEME_OPTIONS: { value: ThemeMode; label: string; swatchClass: string }[] = [
  { value: 'teal', label: 'Teal', swatchClass: 'bg-[hsl(174,65%,30%)]' },
  { value: 'blue', label: 'Blue', swatchClass: 'bg-[hsl(221,70%,42%)]' },
  { value: 'midnight', label: 'Midnight', swatchClass: 'bg-[hsl(199,89%,58%)]' },
];

const STORAGE_KEY = 'approachable-theme';
const THEME_CLASSES: Record<ThemeMode, string | null> = {
  teal: null,
  blue: 'theme-blue',
  midnight: 'dark',
};

interface ThemeModeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

function applyThemeClass(theme: ThemeMode) {
  const root = document.documentElement;
  Object.values(THEME_CLASSES).forEach((cls) => {
    if (cls) root.classList.remove(cls);
  });
  const cls = THEME_CLASSES[theme];
  if (cls) root.classList.add(cls);
}

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'teal';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'teal' || stored === 'blue' || stored === 'midnight' ? stored : 'teal';
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readStoredTheme);

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const setTheme = (next: ThemeMode) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <ThemeModeContext.Provider value={{ theme, setTheme }}>{children}</ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within a ThemeModeProvider');
  return ctx;
}
