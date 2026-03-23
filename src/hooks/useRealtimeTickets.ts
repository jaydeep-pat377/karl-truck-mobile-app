import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabaseAdmin } from '../services/supabase/supabaseClient';

interface UseRealtimeTicketsOptions {
  orderCode: string;
  enabled?: boolean;
  onUpdate?: () => void;
}

export function useRealtimeTickets({
  orderCode,
  enabled = true,
  onUpdate,
}: UseRealtimeTicketsOptions) {
  const ticketsChannelRef = useRef<RealtimeChannel | null>(null);
  const productsChannelRef = useRef<RealtimeChannel | null>(null);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled || !orderCode) return;

    // Channel 1: Ticket changes (same as web)
    const ticketsChannel = supabaseAdmin
      .channel(`tickets-${orderCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
        },
        (payload) => {
          const row = payload.new as Record<string, any>;

          // Client-side filter by order_code
          if (row?.order_code && row.order_code !== orderCode) {
            return;
          }

          console.log('[RealtimeTickets] Ticket change detected, refetching...');
          onUpdateRef.current?.();
        },
      )
      .subscribe((status) => {
        console.log('[RealtimeTickets] Tickets channel:', status);
      });

    // Channel 2: Ticket product changes (same as web)
    const productsChannel = supabaseAdmin
      .channel(`ticket-products-${orderCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_products',
        },
        (payload) => {
          console.log('[RealtimeTickets] Product change detected, refetching...');
          onUpdateRef.current?.();
        },
      )
      .subscribe((status) => {
        console.log('[RealtimeTickets] Products channel:', status);
      });

    ticketsChannelRef.current = ticketsChannel;
    productsChannelRef.current = productsChannel;

    return () => {
      if (ticketsChannelRef.current) {
        supabaseAdmin.removeChannel(ticketsChannelRef.current);
        ticketsChannelRef.current = null;
      }
      if (productsChannelRef.current) {
        supabaseAdmin.removeChannel(productsChannelRef.current);
        productsChannelRef.current = null;
      }
    };
  }, [orderCode, enabled]);

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

export default useRealtimeTickets;
