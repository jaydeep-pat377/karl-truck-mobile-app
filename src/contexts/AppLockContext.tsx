import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/storage';
import { useAuthStore } from '../store/authStore';
import { useBiometrics } from '../hooks/useBiometrics';

const LOCK_TIMEOUT_MS = 60 * 1000; // 1 minute

interface AppLockContextType {
  isLocked: boolean;
  unlock: () => Promise<{ success: boolean; error?: string }>;
  lockApp: () => void;
}

const AppLockContext = createContext<AppLockContextType | undefined>(undefined);

interface AppLockProviderProps {
  children: ReactNode;
}

export const AppLockProvider: React.FC<AppLockProviderProps> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [hasCheckedInitialLock, setHasCheckedInitialLock] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const { isAuthenticated, isInitialized } = useAuthStore();
  const { isEnabled, authenticate, isLoading: isBiometricsLoading } = useBiometrics();

  // Check if app should be locked on initial launch (app killed and reopened)
  const checkInitialLock = useCallback(async () => {
    console.log('[AppLock] Checking initial lock:', { isAuthenticated, isEnabled, isInitialized, isBiometricsLoading });

    if (!isAuthenticated || !isEnabled) {
      console.log('[AppLock] Not locking - auth:', isAuthenticated, 'enabled:', isEnabled);
      setIsLocked(false);
      setHasCheckedInitialLock(true);
      return;
    }

    try {
      const lastBackgroundTime = await AsyncStorage.getItem(STORAGE_KEYS.APP_LAST_BACKGROUND_TIME);
      console.log('[AppLock] Last background time:', lastBackgroundTime);

      if (lastBackgroundTime) {
        // App was backgrounded before - check timeout
        const elapsed = Date.now() - parseInt(lastBackgroundTime, 10);
        console.log('[AppLock] Elapsed time:', elapsed, 'Timeout:', LOCK_TIMEOUT_MS);
        if (elapsed >= LOCK_TIMEOUT_MS) {
          console.log('[AppLock] Locking - timeout exceeded');
          setIsLocked(true);
        }
      } else {
        // No background time stored = app was killed and reopened
        // Lock the app immediately if biometrics are enabled
        console.log('[AppLock] Locking - fresh app start with biometrics enabled');
        setIsLocked(true);
      }
    } catch (error) {
      console.error('[AppLock] Error checking initial lock state:', error);
      // On error, lock the app for security
      setIsLocked(true);
    } finally {
      setHasCheckedInitialLock(true);
    }
  }, [isAuthenticated, isEnabled, isInitialized, isBiometricsLoading]);

  // Check on app mount - wait for both auth and biometrics to be ready
  useEffect(() => {
    const isReady = isInitialized && !isBiometricsLoading;
    console.log('[AppLock] Ready check:', { isInitialized, isBiometricsLoading, isReady, hasCheckedInitialLock });

    if (isReady && !hasCheckedInitialLock) {
      checkInitialLock();
    }
  }, [isInitialized, isBiometricsLoading, hasCheckedInitialLock, checkInitialLock]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        // App going to background - store timestamp
        if (isAuthenticated && isEnabled) {
          console.log('[AppLock] Going to background - saving timestamp');
          await AsyncStorage.setItem(
            STORAGE_KEYS.APP_LAST_BACKGROUND_TIME,
            Date.now().toString()
          );
        }
      } else if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App coming to foreground - check if should lock
        if (isAuthenticated && isEnabled) {
          try {
            const lastBackgroundTime = await AsyncStorage.getItem(STORAGE_KEYS.APP_LAST_BACKGROUND_TIME);

            if (lastBackgroundTime) {
              const elapsed = Date.now() - parseInt(lastBackgroundTime, 10);
              console.log('[AppLock] Returning from background, elapsed:', elapsed);
              if (elapsed >= LOCK_TIMEOUT_MS) {
                console.log('[AppLock] Locking - background timeout exceeded');
                setIsLocked(true);
              }
            }
          } catch (error) {
            console.error('[AppLock] Error checking lock state:', error);
          }
        }
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, isEnabled]);

  // Reset lock state when user logs out
  useEffect(() => {
    if (!isAuthenticated && isInitialized) {
      console.log('[AppLock] User logged out - clearing lock state');
      setIsLocked(false);
      setHasCheckedInitialLock(false);
      AsyncStorage.removeItem(STORAGE_KEYS.APP_LAST_BACKGROUND_TIME);
    }
  }, [isAuthenticated, isInitialized]);

  const unlock = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    console.log('[AppLock] Attempting to unlock');
    const result = await authenticate('Unlock App');

    if (result.success) {
      console.log('[AppLock] Unlock successful');
      setIsLocked(false);
      // Clear the background time so app won't lock again immediately
      await AsyncStorage.removeItem(STORAGE_KEYS.APP_LAST_BACKGROUND_TIME);
    } else {
      console.log('[AppLock] Unlock failed:', result.error);
    }

    return result;
  }, [authenticate]);

  const lockApp = useCallback(() => {
    if (isAuthenticated && isEnabled) {
      console.log('[AppLock] Manual lock triggered');
      setIsLocked(true);
    }
  }, [isAuthenticated, isEnabled]);

  return (
    <AppLockContext.Provider value={{ isLocked, unlock, lockApp }}>
      {children}
    </AppLockContext.Provider>
  );
};

export const useAppLock = (): AppLockContextType => {
  const context = useContext(AppLockContext);
  if (!context) {
    throw new Error('useAppLock must be used within an AppLockProvider');
  }
  return context;
};

export default AppLockContext;
