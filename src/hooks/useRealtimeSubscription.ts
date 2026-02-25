/**
 * Real-Time Subscription Hook
 *
 * Subscribes to Supabase Realtime for live notification updates.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  subscribeToNotifications,
  unsubscribeFromNotifications,
} from '../lib/notification-client';
import { useNotificationStore } from '../store/notificationStore';
import { AppNotification } from '../types/notification';

interface UseRealtimeSubscriptionProps {
  userId: string | null;
  tenantId: number | null;
  onNewNotification?: (notification: AppNotification) => void;
  enabled?: boolean;
}

interface UseRealtimeSubscriptionReturn {
  isConnected: boolean;
  reconnect: () => void;
}

// Map event code to notification type
function mapEventCodeToType(eventCode: string): AppNotification['type'] {
  const typeMap: Record<string, AppNotification['type']> = {
    'ORDER_CREATED': 'order_update',
    'ORDER_UPDATED': 'order_update',
    'ORDER_CANCELLED': 'order_update',
    'DELIVERY_STARTED': 'delivery_update',
    'DELIVERY_COMPLETED': 'delivery_update',
    'DISPATCH_ALERT': 'dispatch_alert',
    'ETA_UPDATE': 'eta_update',
    'WEATHER_ALERT': 'weather_alert',
  };
  return typeMap[eventCode] || 'system';
}

// Map priority number to level
function mapPriorityToLevel(priority: number): AppNotification['priority'] {
  if (priority >= 8) return 'high';
  if (priority >= 4) return 'medium';
  return 'low';
}

// Map database row to AppNotification
function mapRowToNotification(row: any): AppNotification {
  return {
    id: row.queue_uuid || String(row.id),
    type: mapEventCodeToType(row.event_code),
    title: row.subject || row.event_name || 'Notification',
    body: row.body || '',
    priority: mapPriorityToLevel(row.priority || 5),
    isRead: row.status === 'delivered' || row.status === 'read',
    data: {
      queue_uuid: row.queue_uuid,
      event_code: row.event_code,
      event_name: row.event_name,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      customer_name: row.customer_name,
      status: row.status,
    },
    orderId: row.entity_type === 'order' && row.entity_id ? row.entity_id : undefined,
    createdAt: row.created_at,
  };
}

export function useRealtimeSubscription({
  userId,
  tenantId,
  onNewNotification,
  enabled = true,
}: UseRealtimeSubscriptionProps): UseRealtimeSubscriptionReturn {
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onNewNotificationRef = useRef(onNewNotification);
  const { addNotification } = useNotificationStore();

  // Keep callback ref up to date
  useEffect(() => {
    onNewNotificationRef.current = onNewNotification;
  }, [onNewNotification]);

  // Subscribe function
  const subscribe = useCallback(() => {
    console.log('[useRealtimeSubscription] Subscribe called:', { userId, tenantId, enabled });

    if (!userId || !enabled) {
      console.log('[useRealtimeSubscription] Skipping - no userId or not enabled');
      return;
    }

    // Clean up existing subscription
    if (channelRef.current) {
      unsubscribeFromNotifications(channelRef.current);
      channelRef.current = null;
    }

    // Create new subscription
    const channel = subscribeToNotifications(
      userId,
      tenantId,
      // onInsert callback
      (payload) => {
        console.log('[useRealtimeSubscription] New notification received!');
        const notification = mapRowToNotification(payload.new);

        // Client-side tenant filter
        const notifTenantId = payload.new.tenant_id;
        if (tenantId && notifTenantId !== null && notifTenantId !== tenantId) {
          console.log('[useRealtimeSubscription] Tenant mismatch, skipping');
          return;
        }

        // Add to store
        addNotification(notification);

        // Trigger callback
        onNewNotificationRef.current?.(notification);
      },
      // onStatusChange callback
      (status) => {
        console.log('[useRealtimeSubscription] Status changed:', status);
        setIsConnected(status === 'SUBSCRIBED');
      }
    );

    channelRef.current = channel;
  }, [userId, tenantId, enabled, addNotification]);

  // Setup subscription on mount and when dependencies change
  useEffect(() => {
    subscribe();

    return () => {
      if (channelRef.current) {
        unsubscribeFromNotifications(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [subscribe]);

  // Reconnect when app comes to foreground
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active' && userId && enabled) {
        console.log('[useRealtimeSubscription] App active, resubscribing...');
        setTimeout(subscribe, 500);
      }
    };
    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [subscribe, userId, enabled]);

  return {
    isConnected,
    reconnect: subscribe,
  };
}

export default useRealtimeSubscription;
