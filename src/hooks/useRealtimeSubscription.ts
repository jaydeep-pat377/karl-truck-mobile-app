
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getSocket } from '../services/socketClient';
import { useNotificationStore } from '../store/notificationStore';
import { AppNotification } from '../types/notification';
import { buildNotifKey, claimNotification } from '../utils/notificationDedup';

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

function mapPriorityToLevel(priority: number): AppNotification['priority'] {
  if (priority >= 8) return 'high';
  if (priority >= 4) return 'medium';
  return 'low';
}

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
  const onNewNotificationRef = useRef(onNewNotification);
  const { addNotification } = useNotificationStore();


  useEffect(() => {
    onNewNotificationRef.current = onNewNotification;
  }, [onNewNotification]);


  const subscribe = useCallback(() => {
    if (!userId || !enabled) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('join:notifications', { user_id: userId });

    const handleNotification = (payload: any) => {
      const row = payload.new || payload;
      const notification = mapRowToNotification(row);
      const notifTenantId = row.tenant_id;
      if (tenantId && notifTenantId !== null && notifTenantId !== tenantId) {
        return;
      }

      const storeKey = buildNotifKey({
        title: notification.title,
        body: notification.body,
        entityType: row.entity_type,
        entityId: row.entity_id,
      });
      if (claimNotification(`store:${storeKey}`)) {
        addNotification(notification);
      }
      onNewNotificationRef.current?.(notification);
    };

    socket.on('notifications:new', handleNotification);
    setIsConnected(socket.connected);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('notifications:new', handleNotification);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [userId, tenantId, enabled, addNotification]);


  useEffect(() => {
    const cleanup = subscribe();
    return () => cleanup?.();
  }, [subscribe]);


  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active' && userId && enabled) {
        setTimeout(() => subscribe(), 500);
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
