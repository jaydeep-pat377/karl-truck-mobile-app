import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/storage';
import { useAuthStore } from '../store/authStore';
import { useBiometrics } from '../hooks/useBiometrics';

const LOCK_TIMEOUT_MS = 60 * 1000;

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


  const checkInitialLock = useCallback(async () => {
    if (!isAuthenticated || !isEnabled) {
      setIsLocked(false);
      setHasCheckedInitialLock(true);
      return;
    }

    try {
      const lastBackgroundTime = await AsyncStorage.getItem(STORAGE_KEYS.APP_LAST_BACKGROUND_TIME);
      if (lastBackgroundTime) {

        const elapsed = Date.now() - parseInt(lastBackgroundTime, 10);
        if (elapsed >= LOCK_TIMEOUT_MS) {
          setIsLocked(true);
        }
      } else {
        setIsLocked(true);
      }
    } catch (error) {
      setIsLocked(true);
    } finally {
      setHasCheckedInitialLock(true);
    }
  }, [isAuthenticated, isEnabled, isInitialized, isBiometricsLoading]);


  useEffect(() => {
    const isReady = isInitialized && !isBiometricsLoading;
    if (isReady && !hasCheckedInitialLock) {
      checkInitialLock();
    }
  }, [isInitialized, isBiometricsLoading, hasCheckedInitialLock, checkInitialLock]);


  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {

        if (isAuthenticated && isEnabled) {
          await AsyncStorage.setItem(
            STORAGE_KEYS.APP_LAST_BACKGROUND_TIME,
            Date.now().toString()
          );
        }
      } else if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {

        if (isAuthenticated && isEnabled) {
          try {
            const lastBackgroundTime = await AsyncStorage.getItem(STORAGE_KEYS.APP_LAST_BACKGROUND_TIME);

            if (lastBackgroundTime) {
              const elapsed = Date.now() - parseInt(lastBackgroundTime, 10);
              if (elapsed >= LOCK_TIMEOUT_MS) {
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


  useEffect(() => {
    if (!isAuthenticated && isInitialized) {
      setIsLocked(false);
      setHasCheckedInitialLock(false);
      AsyncStorage.removeItem(STORAGE_KEYS.APP_LAST_BACKGROUND_TIME);
    }
  }, [isAuthenticated, isInitialized]);

  const unlock = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const result = await authenticate('Unlock App');

    if (result.success) {
      setIsLocked(false);

      await AsyncStorage.removeItem(STORAGE_KEYS.APP_LAST_BACKGROUND_TIME);
    } else {
      console.log('[AppLock] Unlock failed:', result.error);
    }

    return result;
  }, [authenticate]);

  const lockApp = useCallback(() => {
    if (isAuthenticated && isEnabled) {
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
