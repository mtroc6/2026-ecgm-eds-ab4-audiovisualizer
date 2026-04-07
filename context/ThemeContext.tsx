import { createContext, useContext, useState, type ReactNode } from 'react';
import { useColorScheme as useSystemScheme } from 'react-native';

type ThemeMode = 'auto' | 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolved: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'auto',
  setMode: () => {},
  resolved: 'light',
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('auto');
  const systemScheme = useSystemScheme();
  const resolved: 'light' | 'dark' =
    mode === 'auto' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Drop-in replacement for useColorScheme that respects the manual override */
export function useResolvedColorScheme(): 'light' | 'dark' {
  const { resolved } = useContext(ThemeContext);
  return resolved;
}
