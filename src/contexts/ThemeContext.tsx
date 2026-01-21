import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { Theme, darkTheme, lightTheme, ColorTheme } from '../theme';

interface ThemeContextType {
  theme: Theme;
  themeMode: ColorTheme | 'system';
  isDark: boolean;
  setThemeMode: (mode: ColorTheme | 'system') => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialMode?: ColorTheme | 'system';
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialMode = 'dark', // Default to dark theme based on design reference
}) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ColorTheme | 'system'>(initialMode);

  const resolvedTheme = useMemo((): ColorTheme => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode;
  }, [themeMode, systemColorScheme]);

  const theme = useMemo(() => {
    return resolvedTheme === 'dark' ? darkTheme : lightTheme;
  }, [resolvedTheme]);

  const toggleTheme = useCallback(() => {
    setThemeMode(prev => {
      if (prev === 'system') {
        return systemColorScheme === 'dark' ? 'light' : 'dark';
      }
      return prev === 'dark' ? 'light' : 'dark';
    });
  }, [systemColorScheme]);

  const value = useMemo(
    () => ({
      theme,
      themeMode,
      isDark: theme.isDark,
      setThemeMode,
      toggleTheme,
    }),
    [theme, themeMode, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Hook to get just the theme object
export const useAppTheme = (): Theme => {
  const { theme } = useTheme();
  return theme;
};

export default ThemeContext;
