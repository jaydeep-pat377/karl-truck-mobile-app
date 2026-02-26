/**
 * Real-Time Notifications Hook
 *
 * Subscribes to Supabase Realtime for live notification updates.
 * Uses PostgreSQL Changes to receive INSERT/UPDATE events on notification_queue table.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { notificationSupabase } from '../lib/notification-client';
import { RealtimeChannel } from '@supabase/supabase-js';

// ---------------------
// Types
// ---------------------
export interface RealtimeNotificationItem {
  id: string;           // queue_uuid (stable unique ID)
  dbId: number | string;         // auto-increment id from DB
  title: string;        // subject field
  description: string;  // body field
  type: 'order' | 'truck' | 'alert' | 'info';
  time: string;         // created_at (ISO timestamp)
  read: boolean;        // status === 'delivered'
  eventCode: string;    // event_code
  tenantId: number | null;
  entityType?: string;
  entityId?: string;
}

interface UseRealtimeNotificationsProps {
  userId: string | null;
  tenantId: number | null;
  onNewNotification?: (item: RealtimeNotificationItem) => void;
  enabled?: boolean;
}

interface UseRealtimeNotificationsReturn {
  notifications: RealtimeNotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
  isConnected: boolean;
}

// ---------------------
// Event code to type mapper
// ---------------------
function mapEventCodeToType(eventCode: string): RealtimeNotificationItem['type'] {
  if (!eventCode) return 'info';
  const upper = eventCode.toUpperCase();
  if (upper.startsWith('ORDER') || upper.includes('ORDER')) return 'order';
  if (upper.startsWith('TRUCK') || upper.includes('TRUCK')) return 'truck';
  if (upper.includes('ALERT') || upper.startsWith('PSI') || upper.includes('WEATHER')) return 'alert';
  if (upper.includes('DELIVERY') || upper.includes('DISPATCH') || upper.includes('ETA')) return 'truck';
  return 'info';
}

// ---------------------
// Map database row to NotificationItem
// ---------------------
function mapRow(row: any): RealtimeNotificationItem {
  return {
    id: row.queue_uuid || String(row.id),
    dbId: row.id,
    title: row.subject || row.event_name || 'Notification',
    description: row.body || '',
    type: mapEventCodeToType(row.event_code),
    time: row.created_at,
    read: row.status === 'delivered' || row.status === 'read',
    eventCode: row.event_code || '',
    tenantId: row.tenant_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
  };
}

// ---------------------
// Hook
// ---------------------
export function useRealtimeNotifications({
  userId,
  tenantId,
  onNewNotification,
  enabled = true,
}: UseRealtimeNotificationsProps): UseRealtimeNotificationsReturn {
  const [notifications, setNotifications] = useState<RealtimeNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const onNewNotificationRef = useRef(onNewNotification);

  // Keep callback ref up to date
  useEffect(() => {
    onNewNotificationRef.current = onNewNotification;
  }, [onNewNotification]);

  // ---------------------
  // Fetch initial notifications (last 50)
  // ---------------------
  const fetchInitial = useCallback(async () => {
    if (!userId || !notificationSupabase) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await notificationSupabase
        .from('notification_queue')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      let items = (data || []).map(mapRow);

      // Client-side tenant filter (Supabase Realtime only supports single-column filter)
      if (tenantId) {
        items = items.filter(
          (n) => n.tenantId === null || n.tenantId === tenantId
        );
      }

      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.read).length);
    } catch (err) {
      console.error('[RealtimeNotifications] Failed to fetch:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, tenantId]);

  // ---------------------
  // Subscribe to real-time changes
  // ---------------------
  useEffect(() => {
    console.log('[RealtimeNotifications] Setup check:', {
      userId,
      tenantId,
      enabled,
      hasSupabase: !!notificationSupabase,
    });

    if (!userId || !notificationSupabase || !enabled) {
      console.log('[RealtimeNotifications] Skipping subscription - missing requirements');
      return;
    }

    fetchInitial();

    const channelName = `notifications:${userId}:${tenantId || 'all'}`;
    console.log('[RealtimeNotifications] Subscribing to channel:', channelName);

    const channel = notificationSupabase
      .channel(channelName)
      // --- INSERT event: new notification ---
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_queue',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          console.log('[RealtimeNotifications] INSERT received:', payload);
          const newItem = mapRow(payload.new);

          // Client-side tenant filter
          if (
            tenantId &&
            newItem.tenantId !== null &&
            newItem.tenantId !== tenantId
          ) {
            return;
          }

          // Deduplicate
          setNotifications((prev) => {
            if (prev.some((n) => n.id === newItem.id)) return prev;
            return [newItem, ...prev];
          });

          if (!newItem.read) {
            setUnreadCount((prev) => prev + 1);
          }

          // Trigger sound + push notification callback
          onNewNotificationRef.current?.(newItem);
        }
      )
      // --- UPDATE event: status change (read/unread) ---
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notification_queue',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          console.log('[RealtimeNotifications] UPDATE received:', payload);
          const updated = mapRow(payload.new);

          setNotifications((prev) => {
            const newList = prev.map((n) =>
              n.id === updated.id ? updated : n
            );
            setUnreadCount(newList.filter((n) => !n.read).length);
            return newList;
          });
        }
      )
      .subscribe((status) => {
        console.log('[RealtimeNotifications] Channel status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('[RealtimeNotifications] Unsubscribing from channel');
        notificationSupabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [userId, tenantId, enabled, fetchInitial]);

  // ---------------------
  // Re-fetch when app comes to foreground
  // ---------------------
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active' && userId && enabled) {
        console.log('[RealtimeNotifications] App active, refetching...');
        fetchInitial();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [fetchInitial, userId, enabled]);

  // ---------------------
  // Mark single notification as read (optimistic)
  // ---------------------
  const markAsRead = useCallback(
    async (notificationId: string) => {
      // Find the notification to check if already read
      const notification = notifications.find((n) => n.id === notificationId);
      if (!notification || notification.read) return;

      // Optimistic UI update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        if (!notificationSupabase) return;
        const { error } = await notificationSupabase
          .from('notification_queue')
          .update({ status: 'delivered' })
          .eq('queue_uuid', notificationId);

        if (error) throw error;
      } catch (err) {
        console.error('[RealtimeNotifications] Failed to mark as read:', err);
        fetchInitial(); // Revert on error
      }
    },
    [notifications, fetchInitial]
  );

  // ---------------------
  // Mark all as read (optimistic)
  // ---------------------
  const markAllAsRead = useCallback(async () => {
    if (!userId || !notificationSupabase) return;

    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      const { error } = await notificationSupabase
        .from('notification_queue')
        .update({ status: 'delivered' })
        .eq('user_id', userId)
        .in('status', ['pending', 'sent']);

      if (error) throw error;
    } catch (err) {
      console.error('[RealtimeNotifications] Failed to mark all as read:', err);
      fetchInitial(); // Revert on error
    }
  }, [userId, fetchInitial]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch: fetchInitial,
    isConnected,
  };
}

export default useRealtimeNotifications;
