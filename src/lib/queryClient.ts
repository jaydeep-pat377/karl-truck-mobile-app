import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';

// Allows external code (e.g. tab bar) to trigger a React Query focus event
// so that stale queries refetch automatically on tab press.
let triggerFocusRefetch: (() => void) | null = null;

export const notifyScreenFocus = () => {
  triggerFocusRefetch?.();
};

focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener(
    'change',
    (state: AppStateStatus) => {
      if (Platform.OS !== 'web') {
        handleFocus(state === 'active');
      }
    },
  );

  // Called from CustomTabBar on every tab press — handleFocus() with no args
  // always notifies listeners (bypasses the "changed" check).
  triggerFocusRefetch = () => handleFocus();

  return () => {
    subscription.remove();
    triggerFocusRefetch = null;
  };
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});
