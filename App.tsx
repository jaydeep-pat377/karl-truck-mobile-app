import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StatusBar,
  LogBox,
  View,
  Text,
  Linking,
  NativeModules,
  Platform,
  AppState,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BootSplash from 'react-native-bootsplash';
import './src/locales';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { GlobalAlertProvider } from './src/contexts/GlobalAlertContext';
import { RootNavigator } from './src/navigation';
import { useNotifications } from './src/hooks/useNotifications';
import { useAuthStore } from './src/store/authStore';
import { AnimatedSplashScreen } from './src/components/AnimatedSplashScreen';
import { initSentry, ErrorBoundary } from './src/services/sentryService';
import { navigationRef, navigateFromNotification } from './src/services/navigationService';
import { NotificationProvider } from './src/providers/NotificationProvider';
import { AppLockProvider } from './src/contexts/AppLockContext';
import { LockScreen } from './src/components/LockScreen';
import { handleDeepLink, isShortUrl } from './src/services/deepLinkService';
import { API_BASE_URL } from '@env';

// Initialize Sentry
initSentry();

// Note: Background message handlers are registered in index.js for killed state support

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

const AppContent: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
  const [animationCompleted, setAnimationCompleted] = useState(false);
  const [navigationReady, setNavigationReady] = useState(false);
  const { isInitialized, user, isAuthenticated } = useAuthStore();
  useNotifications();

  const [isHandlingDeepLink, setIsHandlingDeepLink] = useState(false);
  const pendingDeepLinkRef = useRef<string | null>(null);
  const lastHandledUrlRef = useRef<string | null>(null);

  const userId = user?.id || null;
  const tenantId = user?.metadata?.tenant?.tenant_id ?? null;

  const handleNotificationTap = useCallback((data: any) => {
    if (data?.eventCode || data?.event_code) {
      navigateFromNotification(data);
    }
  }, []);

  useEffect(() => {
    // Hide native splash immediately to show our animated splash
    const hideSplash = async () => {
      await BootSplash.hide({ fade: false }); // No fade - we handle animation ourselves
    };
    hideSplash();
  }, []);

  // Hide splash when all conditions are met
  useEffect(() => {
    if (animationCompleted && navigationReady && isInitialized) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setShowAnimatedSplash(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [animationCompleted, navigationReady, isInitialized]);

  const handleSplashComplete = useCallback(() => {
    setAnimationCompleted(true);
  }, []);

  const handleNavigationReady = useCallback(() => {
    setNavigationReady(true);
  }, []);

  const runDeepLink = useCallback(async (url: string) => {
    setIsHandlingDeepLink(true);
    try {
      await handleDeepLink(url);
    } finally {
      setIsHandlingDeepLink(false);
    }
  }, []);

  const processDeepLink = useCallback(
    (url: string) => {
      if (!isShortUrl(url)) {
        return;
      }

      if (isAuthenticated) {
        runDeepLink(url);
      } else {
        console.log('[DeepLink] url......', url);
        pendingDeepLinkRef.current = url;
      }
    },
    [isAuthenticated, runDeepLink],
  );

  const getDeepLinkFromIntent = useCallback(async (): Promise<string | null> => {
    try {
      if (Platform.OS === 'android' && NativeModules.DeepLinkModule) {
        const url = await NativeModules.DeepLinkModule.getDeepLinkUrl();
        return url || null;
      }
      return await Linking.getInitialURL();
    } catch {
      return await Linking.getInitialURL();
    }
  }, []);

  // Clear the deep link URL from the Android intent after reading it, so
  // the next AppState 'active' check doesn't re-process the same stale URL.
  const clearDeepLinkIntent = useCallback(async () => {
    try {
      if (Platform.OS === 'android' && NativeModules.DeepLinkModule) {
        await NativeModules.DeepLinkModule.clearDeepLinkUrl();
      }
    } catch {
      // ignore
    }
  }, []);

  // Check for a deep link URL from the native intent and dispatch it
  // through processDeepLink. De-duped via lastHandledUrlRef.
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

  // Listen for Linking events (iOS universal links + Android fallback).
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

  // Cold-start check: read the initial intent URL once on mount.
  useEffect(() => {
    checkForDeepLink();
  }, [checkForDeepLink]);

  // Warm-start check: re-read the intent when the app becomes active.
  // This covers the onNewIntent path for singleTask launchMode.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkForDeepLink();
      }
    });
    return () => subscription.remove();
  }, [checkForDeepLink]);

  // Once the user finishes logging in, run any pending deep link.
  useEffect(() => {
    if (isAuthenticated && pendingDeepLinkRef.current) {
      const pendingUrl = pendingDeepLinkRef.current;
      pendingDeepLinkRef.current = null;
      console.log('[DeepLink] Processing pending deep link after login:', pendingUrl);
      runDeepLink(pendingUrl);
    }
  }, [isAuthenticated, runDeepLink]);

  return (
    <AppLockProvider>
      <>
        <StatusBar
          barStyle={showAnimatedSplash || isDark ? 'light-content' : 'dark-content'}
          backgroundColor={showAnimatedSplash ? 'transparent' : theme.colors.background}
          translucent={showAnimatedSplash}
        />
        <NavigationContainer
          ref={navigationRef}
          onReady={handleNavigationReady}
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
          }}>
          <NotificationProvider
            userId={userId}
            tenantId={tenantId}
            onNotificationTap={handleNotificationTap}
            enabled={isAuthenticated}>
            <RootNavigator />
          </NotificationProvider>
        </NavigationContainer>

        {/* Lock Screen - renders on top of app content */}
        <LockScreen />

        {/* Animated Splash Screen - renders on top of everything */}
        {showAnimatedSplash && (
          <AnimatedSplashScreen onAnimationComplete={handleSplashComplete} />
        )}

        {/* Deep Link loader - shows while resolving a short URL and navigating.
            Suppressed during the initial boot splash to avoid stacking two. */}
        {isHandlingDeepLink && !showAnimatedSplash && (
          <AnimatedSplashScreen onAnimationComplete={() => {}} />
        )}
      </>
    </AppLockProvider>
  );
};

// Fallback component for Sentry error boundary
const ErrorFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Something went wrong</Text>
    <Text style={{ color: '#666', textAlign: 'center', marginBottom: 20 }}>
      {error?.message || 'An unexpected error occurred'}
    </Text>
    <Text
      style={{ color: '#007AFF', fontSize: 16 }}
      onPress={resetError}
    >
      Try Again
    </Text>
  </View>
);

const App: React.FC = () => {
  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider initialMode="light">
              <GlobalAlertProvider>
                <AppContent />
              </GlobalAlertProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

export default App;
