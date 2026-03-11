
import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform, PermissionsAndroid } from 'react-native';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import 'react-native-url-polyfill/auto';

const CHANNEL_ID = 'truckast_heads_up';

const SUPABASE_URL = 'https://tabpplqpetdgruqmliix.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhYnBwbHFwZXRkZ3J1cW1saWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzMxNTgsImV4cCI6MjA4MjA0OTE1OH0.JqG84aRxD88qT1rlY_Rbe2r8QSX9U_ksP3IV9RqYSZg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

const EVENT_CODE_MAP: Record<string, 'order' | 'truck' | 'alert' | 'info'> = {
  ORDER_CREATED: 'order',
  ORDER_UPDATED: 'order',
  ORDER_CANCELLED: 'order',
  ORDER_CONFIRMED: 'order',
  ORDER_COMPLETED: 'order',
  TRUCK_DISPATCHED: 'truck',
  TRUCK_ARRIVED: 'truck',
  TRUCK_DELAYED: 'truck',
  TRUCK_EN_ROUTE: 'truck',
  PSI_ALERT: 'alert',
  WEATHER_ALERT: 'alert',
  CAPACITY_ALERT: 'alert',
  SYSTEM_ALERT: 'alert',
};

export type NotificationType = 'order' | 'truck' | 'alert' | 'info';

export function mapEventCodeToType(eventCode: string | null): NotificationType {
  if (!eventCode) return 'info';
  const upperCode = eventCode.toUpperCase();
  return EVENT_CODE_MAP[upperCode] ?? 'info';
}

export function formatRelativeTime(dateString: string): string {
  const diffSeconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000
  );
  if (diffSeconds < 0 || diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} min ago`;
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  const days = Math.floor(diffSeconds / 86400);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export interface Notification {
  id: string;
  queue_uuid: string;
  subject: string;
  body: string;
  event_code: string;
  event_name: string;
  entity_type: string;
  entity_id: number | null;
  status: string;
  priority: number;
  created_at: string;
  tenant_id: number;
  isNew?: boolean;
}

export interface NotificationItem {
  id: string;
  queueUuid: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: NotificationType;
  createdAt: string;
  eventCode: string;
  entityType: string;
  entityId: number | null;
  priority: number;
  isNew?: boolean;
}

export function mapRowToNotificationItem(row: Notification): NotificationItem {
  return {
    id: row.id,
    queueUuid: row.queue_uuid,
    title: row.subject ?? 'Notification',
    description: row.body ?? '',
    time: formatRelativeTime(row.created_at),
    read: row.status === 'delivered' || row.status === 'read',
    type: mapEventCodeToType(row.event_code),
    createdAt: row.created_at,
    eventCode: row.event_code,
    entityType: row.entity_type,
    entityId: row.entity_id,
    priority: row.priority,
    isNew: row.isNew,
  };
}

interface UseSupabaseNotificationsProps {
  userId: string | null;
  tenantId: number | null;
  enabled?: boolean;

  onNewNotification?: (notification: NotificationItem) => void;
}

interface UseSupabaseNotificationsReturn {

  notifications: Notification[];

  notificationItems: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;

  reconnect: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;

export function useSupabaseNotifications({
  userId,
  tenantId,
  enabled = true,
  onNewNotification,
}: UseSupabaseNotificationsProps): UseSupabaseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttempts = useRef(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const subscribeRef = useRef<() => void>(() => {});
  const fetchRef = useRef<() => Promise<void>>(async () => {});
  const onNewNotificationRef = useRef(onNewNotification);


  useEffect(() => {
    onNewNotificationRef.current = onNewNotification;
  }, [onNewNotification]);


  useEffect(() => {
    setNotificationItems(notifications.map(mapRowToNotificationItem));
  }, [notifications]);


  useEffect(() => {
    const interval = setInterval(() => {
      setNotificationItems((prev) =>
        prev.map((item) => ({
          ...item,
          time: formatRelativeTime(item.createdAt),
        }))
      );
    }, 60_000);
    return () => clearInterval(interval);
  }, []);


  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    try {
      const settings = await notifee.requestPermission();
      const authorized = settings.authorizationStatus >= 1;
      console.log('[useSupabaseNotifications] Notification permission:', authorized ? 'granted' : 'denied');
      return authorized;
    } catch (error) {
      console.error('[useSupabaseNotifications] Error requesting notification permission:', error);
      return false;
    }
  }, []);


  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);


  const showLocalNotification = useCallback(async (notification: Notification) => {
    console.log('[useSupabaseNotifications] 📱 Attempting to show local notification...');
    console.log('[useSupabaseNotifications] App state:', appStateRef.current);


    if (appStateRef.current !== 'active') {
      console.log('[useSupabaseNotifications] ⚠️ App not active, skipping notification');
      return;
    }

    try {

      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: CHANNEL_ID,
          name: 'TruckAst Alerts',
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          sound: 'default',
          vibration: true,
        });
      }

      console.log('[useSupabaseNotifications] Displaying notification:', {
        title: notification.subject,
        body: notification.body,
      });

      await notifee.displayNotification({
        title: notification.subject || 'New Notification',
        body: notification.body || '',
        data: {
          notification_id: String(notification.id),
          event_code: notification.event_code || '',
        },
        android: {
          channelId: CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          pressAction: { id: 'default' },
          smallIcon: 'ic_launcher',
          sound: 'default',
        },
        ios: {
          sound: 'default',
          foregroundPresentationOptions: {
            badge: true,
            sound: true,
            banner: true,
            list: true,
          },
        },
      });

      console.log('[useSupabaseNotifications] ✅ Notification displayed');
    } catch (err) {
      console.error('[useSupabaseNotifications] ❌ Failed to show local notification:', err);
    }
  }, []);


  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    console.log('[useSupabaseNotifications] Fetching notifications for user:', userId);
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        console.error('[useSupabaseNotifications] Fetch error:', fetchError);
        setError(fetchError.message);
        return;
      }


      let filteredData = data || [];
      if (tenantId) {
        filteredData = filteredData.filter(
          (n) => n.tenant_id === null || n.tenant_id === tenantId
        );
      }

      console.log('[useSupabaseNotifications] Fetched', filteredData.length, 'notifications');
      setNotifications(filteredData);
    } catch (err: any) {
      console.error('[useSupabaseNotifications] Exception:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId, tenantId]);


  const handleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('[useSupabaseNotifications] Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    reconnectAttempts.current++;

    console.log(`[useSupabaseNotifications] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);

    setTimeout(() => {
      if (userId && enabled) {
        subscribeRef.current();
        fetchRef.current();
      }
    }, delay);
  }, [userId, enabled]);


  const subscribe = useCallback(() => {
    if (!userId || !enabled) {
      console.log('[useSupabaseNotifications] Not subscribing - userId:', userId, 'enabled:', enabled);
      return;
    }


    if (channelRef.current) {
      console.log('[useSupabaseNotifications] Removing existing channel');
      supabase.removeChannel(channelRef.current);
    }

    const channelName = `notifications:${userId}:${tenantId ?? 'global'}`;
    console.log('[useSupabaseNotifications] Creating subscription:', channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_queue',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[useSupabaseNotifications] 🔔 NEW NOTIFICATION:', payload.new);
          const newNotification = {
            ...payload.new as Notification,
            isNew: true,
          };


          if (tenantId && newNotification.tenant_id !== null && newNotification.tenant_id !== tenantId) {
            return;
          }


          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotification.id)) {
              return prev;
            }
            return [newNotification, ...prev];
          });


          showLocalNotification(newNotification);


          if (onNewNotificationRef.current) {
            onNewNotificationRef.current(mapRowToNotificationItem(newNotification));
          }


          setTimeout(() => {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === newNotification.id ? { ...n, isNew: false } : n
              )
            );
          }, 5000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notification_queue',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[useSupabaseNotifications] 📝 NOTIFICATION UPDATED:', payload.new);
          const updatedNotification = payload.new as Notification;

          setNotifications((prev) =>
            prev.map((n) =>
              n.id === updatedNotification.id ? updatedNotification : n
            )
          );
        }
      )
      .subscribe((status, err) => {
        console.log('[useSupabaseNotifications] Subscription status:', status);

        if (status === 'SUBSCRIBED') {
          reconnectAttempts.current = 0;
          setIsConnected(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          if (err) {
            console.error('[useSupabaseNotifications] Subscription error:', err);
            setError(String(err));
          }
          handleReconnect();
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;
  }, [userId, tenantId, enabled, showLocalNotification, handleReconnect]);


  const reconnect = useCallback(() => {
    if (userId && enabled) {
      console.log('[useSupabaseNotifications] Manual reconnect triggered');
      reconnectAttempts.current = 0;
      subscribe();
      fetchNotifications();
    }
  }, [userId, enabled, subscribe, fetchNotifications]);


  useEffect(() => {
    subscribeRef.current = subscribe;
    fetchRef.current = fetchNotifications;
  }, [subscribe, fetchNotifications]);


  useEffect(() => {
    if (userId && enabled) {
      fetchNotifications();
      subscribe();
    }

    return () => {
      if (channelRef.current) {
        console.log('[useSupabaseNotifications] Cleanup: removing channel');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, enabled, fetchNotifications, subscribe]);


  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      appStateRef.current = state;
      if (state === 'active' && userId && enabled) {
        console.log('[useSupabaseNotifications] App active, refreshing...');
        reconnectAttempts.current = 0;
        fetchNotifications();
        subscribe();
      }
    });
    return () => subscription.remove();
  }, [userId, enabled, subscribe, fetchNotifications]);


  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected && userId && enabled) {
        console.log('[useSupabaseNotifications] Network restored, reconnecting...');
        reconnectAttempts.current = 0;
        subscribe();
        fetchNotifications();
      }
    });
    return () => unsubscribe();
  }, [userId, enabled, subscribe, fetchNotifications]);


  const markAsRead = useCallback(async (id: string) => {

    const notification = notifications.find((n) => n.id === id || n.queue_uuid === id);
    if (!notification || notification.status === 'delivered' || notification.status === 'read') {
      return;
    }


    setNotifications((prev) =>
      prev.map((n) => (n.id === id || n.queue_uuid === id ? { ...n, status: 'delivered' } : n))
    );

    try {
      const { error: updateError } = await supabase
        .from('notification_queue')
        .update({ status: 'delivered' })
        .eq('queue_uuid', notification.queue_uuid);

      if (updateError) {
        console.error('[useSupabaseNotifications] Failed to mark as read:', updateError);

        fetchNotifications();
      }
    } catch (err) {
      console.error('[useSupabaseNotifications] Exception marking as read:', err);
      fetchNotifications();
    }
  }, [notifications, fetchNotifications]);


  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    const unreadIds = notifications
      .filter((n) => n.status !== 'delivered' && n.status !== 'read')
      .map((n) => n.queue_uuid);

    if (unreadIds.length === 0) return;


    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'delivered' })));

    try {
      const { error: updateError } = await supabase
        .from('notification_queue')
        .update({ status: 'delivered' })
        .in('queue_uuid', unreadIds);

      if (updateError) {
        console.error('[useSupabaseNotifications] Failed to mark all as read:', updateError);
        fetchNotifications();
      }
    } catch (err) {
      console.error('[useSupabaseNotifications] Exception marking all as read:', err);
      fetchNotifications();
    }
  }, [userId, notifications, fetchNotifications]);


  const unreadCount = notifications.filter(
    (n) => n.status !== 'read' && n.status !== 'delivered'
  ).length;

  return {
    notifications,
    notificationItems,
    unreadCount,
    isLoading,
    isConnected,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    reconnect,
  };
}

export default useSupabaseNotifications;
