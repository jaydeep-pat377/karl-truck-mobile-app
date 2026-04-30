/**
 * TruckAst Dolese ReadyMix Mobile App
 * Main Application Entry Point
 */

import React, { useState, useCallback } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Theme Provider
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// Components
import { SplashScreen } from './components/common';

// i18n
import './locales';
import { i18nReady } from './locales';

// Navigation
import { RootNavigator } from './navigation';

// Ignore specific warnings (optional)
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

// Create a React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
  },
});

// Inner app component that uses theme context
interface AppContentProps {
  onReady?: () => void;
}

const AppContentWithSplash: React.FC<AppContentProps> = ({ onReady }) => {
  const { theme, isDark } = useTheme();

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <NavigationContainer
        onReady={onReady}
        theme={{
          dark: isDark,
          colors: {
            primary: theme.colors.primary.main,
            background: theme.colors.background,
            card: theme.colors.card,
            text: theme.colors.text,
            border: theme.colors.border,
            notification: theme.colors.error.main,
          },
          fonts: {
            regular: {
              fontFamily: 'System',
              fontWeight: '400',
            },
            medium: {
              fontFamily: 'System',
              fontWeight: '500',
            },
            bold: {
              fontFamily: 'System',
              fontWeight: '700',
            },
            heavy: {
              fontFamily: 'System',
              fontWeight: '900',
            },
          },
        }}
      >
        <RootNavigator isAuthenticated={true} />
      </NavigationContainer>
    </>
  );
};

// Main App component with all providers
const App: React.FC = () => {
  const [isAppReady, setIsAppReady] = useState(false);
  const [isI18nReady, setIsI18nReady] = useState(false);

<<<<<<< Updated upstream
=======
  useEffect(() => {
    i18nReady.finally(() => setIsI18nReady(true));
    initializeSupabaseAuth().then((session) => {
      if (session) {
        console.log('@@@@@@ Supabase auth initialized successfully');
      }
    });
  }, []);

>>>>>>> Stashed changes
  const onNavigationReady = useCallback(() => {
    // Hide splash screen when navigation is ready
    setIsAppReady(true);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {(!isAppReady || !isI18nReady) && <SplashScreen message="Loading..." />}
      {isI18nReady && (
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider initialMode="dark">
              <AppContentWithSplash onReady={onNavigationReady} />
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      )}
    </GestureHandlerRootView>
  );
};

export default App;
