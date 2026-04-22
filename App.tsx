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
import { QueryClientProvider } from '@tanstack/react-query';
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
import { queryClient } from './src/lib/queryClient';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { API_BASE_URL } from '@env';

initSentry();

// Background message handlers are registered in index.js for killed state support

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

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
    BootSplash.hide({ fade: false });
  }, []);

  useEffect(() => {
    if (animationCompleted && navigationReady && isInitialized) {
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

  // Clear Android intent so the next AppState 'active' check doesn't re-process it
  const clearDeepLinkIntent = useCallback(async () => {
    try {
      if (Platform.OS === 'android' && NativeModules.DeepLinkModule) {
        await NativeModules.DeepLinkModule.clearDeepLinkUrl();
      }
    } catch {
      // ignore
    }
  }, []);

  const checkForDeepLink = useCallback(async () => {
    try {
      const url = await getDeepLinkFromIntent();
      if (url && isShortUrl(url) && url !== lastHandledUrlRef.current) {
        lastHandledUrlRef.current = url;
        await clearDeepLinkIntent();
        processDeepLink(url);
      }
    } catch (error) {
      console.error('[DeepLink] Error checking deep link:', error);
    }
  }, [getDeepLinkFromIntent, clearDeepLinkIntent, processDeepLink, isAuthenticated]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url !== lastHandledUrlRef.current) {
        lastHandledUrlRef.current = url;
        processDeepLink(url);
      }
    });
    return () => subscription.remove();
  }, [processDeepLink]);

  useEffect(() => {
    checkForDeepLink();
  }, [checkForDeepLink]);

  // Re-read intent when app becomes active (singleTask launchMode)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkForDeepLink();
      }
    });
    return () => subscription.remove();
  }, [checkForDeepLink]);

  // Process pending deep link after login
  useEffect(() => {
    if (isAuthenticated && pendingDeepLinkRef.current) {
      const pendingUrl = pendingDeepLinkRef.current;
      pendingDeepLinkRef.current = null;
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

        <LockScreen />

        {showAnimatedSplash && (
          <AnimatedSplashScreen onAnimationComplete={handleSplashComplete} />
        )}

        {/* Deep link loader — suppressed during boot splash to avoid stacking */}
        {isHandlingDeepLink && !showAnimatedSplash && (
          <AnimatedSplashScreen onAnimationComplete={() => {}} />
        )}
      </>
    </AppLockProvider>
  );
};

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
        <KeyboardProvider>
          <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider initialMode="light">
                <GlobalAlertProvider>
                  <AppContent />
                </GlobalAlertProvider>
              </ThemeProvider>
            </QueryClientProvider>
          </SafeAreaProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

export default App;
