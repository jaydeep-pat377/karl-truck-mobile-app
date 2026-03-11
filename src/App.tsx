
import React, { useState, useCallback, useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { NotificationProvider } from './providers/NotificationProvider';
import { useAuthStore } from './store/authStore';

import { SplashScreen } from './components/common';

import { initializeSupabaseAuth } from './services/supabase/supabaseClient';

import './locales';

import { RootNavigator } from './navigation';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

interface AppContentProps {
  onReady?: () => void;
}

const AppContentWithSplash: React.FC<AppContentProps> = ({ onReady }) => {
  const { theme, isDark } = useTheme();
  const { user } = useAuthStore();


  const userId = user?.id ?? null;
  const tenantId = user?.metadata?.tenant?.tenant_id ?? null;

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <NotificationProvider
        userId={userId}
        tenantId={tenantId}
        enabled={!!userId}
      >
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
      </NotificationProvider>
    </>
  );
};

const App: React.FC = () => {
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    initializeSupabaseAuth().then((session) => {
      console.log('session>>>>>>',session);

      if (session) {
        console.log('@@@@@@ Supabase auth initialized successfully');
      }
    });
  }, []);

  const onNavigationReady = useCallback(() => {

    setIsAppReady(true);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {!isAppReady && <SplashScreen message="Loading..." />}
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider initialMode="dark">
            <AppContentWithSplash onReady={onNavigationReady} />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
