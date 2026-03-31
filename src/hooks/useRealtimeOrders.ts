import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabaseAdmin } from '../services/supabase/supabaseClient';

const DEBOUNCE_MS = 60000;

interface UseRealtimeOrdersOptions {
  enabled?: boolean;
  onUpdate?: () => void;
}

export function useRealtimeOrders({
  enabled = true,
  onUpdate,
}: UseRealtimeOrdersOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCalledRef = useRef<number>(0);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Immediate on first change, then debounce subsequent changes within 1 second
  const debouncedUpdate = useCallback(() => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCalledRef.current;

    if (timeSinceLastCall >= DEBOUNCE_MS) {
      // First change or enough time passed — update immediately
      lastCalledRef.current = now;
      onUpdateRef.current?.();
    } else {
      // Within debounce window — schedule update at end of window
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

  // Realtime WebSocket subscription on orders table
  useEffect(() => {
    if (!enabled) return;

    const channel = supabaseAdmin
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('[RealtimeOrders] Order change detected:', payload.eventType);
          debouncedUpdate();
        },
      )
      .subscribe((status) => {
        console.log('[RealtimeOrders] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabaseAdmin.removeChannel(channelRef.current);
        channelRef.current = null;
      }
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
