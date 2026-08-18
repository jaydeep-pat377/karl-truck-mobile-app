import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getSocket } from '../services/socketClient';

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
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled || !orderCode) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('join:tickets', { order_code: orderCode });

    const handleTicketChange = (payload: any) => {
      const row = payload?.new || payload;
      if (row?.order_code && row.order_code !== orderCode) return;
      console.log('[RealtimeTickets] Ticket change detected, refetching...');
      onUpdateRef.current?.();
    };

    const handleProductChange = () => {
      onUpdateRef.current?.();
    };

    socket.on('tickets:change', handleTicketChange);
    socket.on('ticket_products:change', handleProductChange);

    return () => {
      socket.emit('leave:tickets', { order_code: orderCode });
      socket.off('tickets:change', handleTicketChange);
      socket.off('ticket_products:change', handleProductChange);
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
