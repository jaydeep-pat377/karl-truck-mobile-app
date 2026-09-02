import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getSocket } from '../services/socketClient';

const DEBOUNCE_MS = 60000;

interface UseRealtimeOrdersOptions {
  enabled?: boolean;
  onUpdate?: () => void;
}

export function useRealtimeOrders({
  enabled = true,
  onUpdate,
}: UseRealtimeOrdersOptions) {
  const onUpdateRef = useRef(onUpdate);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCalledRef = useRef<number>(0);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const debouncedUpdate = useCallback(() => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCalledRef.current;

    if (timeSinceLastCall >= DEBOUNCE_MS) {
      lastCalledRef.current = now;
      onUpdateRef.current?.();
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        lastCalledRef.current = Date.now();
        onUpdateRef.current?.();
        timerRef.current = null;
      }, DEBOUNCE_MS - timeSinceLastCall);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('join:orders');

    const handleOrderChange = () => {
      console.log('[RealtimeOrders] Order change detected via Socket.io');
      debouncedUpdate();
    };

    socket.on('orders:changed', handleOrderChange);

    return () => {
      socket.off('orders:changed', handleOrderChange);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, debouncedUpdate]);

  // Refetch on app resume
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active' && enabled) {
        onUpdateRef.current?.();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [enabled]);
}

export default useRealtimeOrders;
