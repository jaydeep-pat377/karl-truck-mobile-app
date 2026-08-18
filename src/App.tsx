
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StatusBar, LogBox, Linking, AppState, NativeModules, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { NotificationProvider } from './providers/NotificationProvider';
import { useAuthStore } from './store/authStore';

import { SplashScreen } from './components/common';

import { restoreSocketFromStorage } from './services/socketClient';

import { i18nReady } from './locales';

import { RootNavigator } from './navigation';
import { navigationRef } from './services/navigationService';
import { handleDeepLink, isShortUrl } from './services/deepLinkService';
import { queryClient } from './lib/queryClient';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

interface AppContentProps {
  onReady?: () => void;
}

const AppContentWithSplash: React.FC<AppContentProps> = ({ onReady }) => {
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated } = useAuthStore();
  const pendingDeepLinkRef = useRef<string | null>(null);
  const [isHandlingDeepLink, setIsHandlingDeepLink] = useState(false);

  const userId = user?.id ?? null;
  const tenantId = user?.metadata?.tenant?.tenant_id ?? null;

  // Run the full deep link resolution flow while showing a loading overlay
  const runDeepLink = useCallback(async (url: string) => {
    setIsHandlingDeepLink(true);
    try {
      await handleDeepLink(url);
    } finally {
      setIsHandlingDeepLink(false);
    }
  }, []);

  // Process a deep link URL: if authenticated, handle immediately; otherwise, store as pending
  const processDeepLink = useCallback(
    (url: string) => {
      if (!isShortUrl(url)) {
        return;
      }

      if (isAuthenticated) {
        runDeepLink(url);
      } else {
        console.log('[DeepLink] User not authenticated, storing pending link');
        pendingDeepLinkRef.current = url;
      }
    },
    [isAuthenticated, runDeepLink],
  );

  // Track the last handled URL to avoid processing the same deep link twice
  const lastHandledUrlRef = useRef<string | null>(null);

  // Read deep link URL directly from Android intent via native module
  const getDeepLinkFromIntent = useCallback(async (): Promise<string | null> => {
    try {
      if (Platform.OS === 'android' && NativeModules.DeepLinkModule) {
        const url = await NativeModules.DeepLinkModule.getDeepLinkUrl();
        return url || null;
      }
      // Fallback to Linking for iOS or if native module not available
      return await Linking.getInitialURL();
    } catch {
      return await Linking.getInitialURL();
    }
  }, []);

  // Clear the deep link URL from intent after handling
  const clearDeepLinkIntent = useCallback(async () => {
    try {
      if (Platform.OS === 'android' && NativeModules.DeepLinkModule) {
        await NativeModules.DeepLinkModule.clearDeepLinkUrl();
      }
    } catch {
      // ignore
    }
  }, []);

  // Check for deep link URL from the Android intent
  const checkForDeepLink = useCallback(async () => {
    try {
      const url = await getDeepLinkFromIntent();
      console.log('[DeepLink] Intent URL:', url, 'isAuth:', isAuthenticated);
      if (url && isShortUrl(url) && url !== lastHandledUrlRef.current) {
        lastHandledUrlRef.current = url;
        await clearDeepLinkIntent();
        processDeepLink(url);
      }
    } catch (error) {
      console.error('[DeepLink] Error checking deep link:', error);
    }
  }, [getDeepLinkFromIntent, clearDeepLinkIntent, processDeepLink, isAuthenticated]);

  // Listen for Linking events (iOS + Android fallback)
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[DeepLink] Received URL via Linking event:', url);
      if (url !== lastHandledUrlRef.current) {
        lastHandledUrlRef.current = url;
        processDeepLink(url);
      }
    });
    return () => subscription.remove();
  }, [processDeepLink]);

  // Check on mount
  useEffect(() => {
    checkForDeepLink();
  }, [checkForDeepLink]);

  // Check when app becomes active (handles onNewIntent for singleTask)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkForDeepLink();
      }
    });
    return () => subscription.remove();
  }, [checkForDeepLink]);

  // Process pending deep link after user authenticates
  useEffect(() => {
    if (isAuthenticated && pendingDeepLinkRef.current) {
      const pendingUrl = pendingDeepLinkRef.current;
      pendingDeepLinkRef.current = null;
      console.log('[DeepLink] Processing pending deep link after login:', pendingUrl);
      runDeepLink(pendingUrl);
    }
  }, [isAuthenticated, runDeepLink]);

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
          ref={navigationRef}
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
          <RootNavigator />
        </NavigationContainer>
      </NotificationProvider>
      {isHandlingDeepLink && <SplashScreen />}
    </>
  );
};

const App: React.FC = () => {
  const [isAppReady, setIsAppReady] = useState(false);
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    i18nReady.then(() => setIsI18nReady(true));
    // Restore Socket.io connection from cached backend URL
    (async () => {
      const socket = await restoreSocketFromStorage();
      if (socket) {
        console.log('[App] Socket.io connection restored');
      }
    })();
  }, []);

  const onNavigationReady = useCallback(() => {

    setIsAppReady(true);
  }, []);

  if (!isI18nReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SplashScreen message="Loading..." />
      </GestureHandlerRootView>
    );
  }

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
