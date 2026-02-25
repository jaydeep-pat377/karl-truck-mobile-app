/**
 * Supabase Real-Time Notifications Hook
 *
 * Fetches initial notifications from Supabase and subscribes to real-time updates.
 * No API calls - everything goes through Supabase directly.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Supabase credentials
const SUPABASE_URL = 'https://tabpplqpetdgruqmliix.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhYnBwbHFwZXRkZ3J1cW1saWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzMxNTgsImV4cCI6MjA4MjA0OTE1OH0.JqG84aRxD88qT1rlY_Rbe2r8QSX9U_ksP3IV9RqYSZg';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

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
  isNew?: boolean; // Flag for newly received notifications
}

interface UseSupabaseNotificationsProps {
  userId: string | null;
  tenantId: number | null;
  enabled?: boolean;
}

interface UseSupabaseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export function useSupabaseNotifications({
  userId,
  tenantId,
  enabled = true,
}: UseSupabaseNotificationsProps): UseSupabaseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch notifications from Supabase
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
        .eq('channel_code', 'in_app')
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        console.error('[useSupabaseNotifications] Fetch error:', fetchError);
        setError(fetchError.message);
        return;
      }

      console.log('[useSupabaseNotifications] Fetched', data?.length || 0, 'notifications');
      setNotifications(data || []);
    } catch (err: any) {
      console.error('[useSupabaseNotifications] Exception:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Subscribe to real-time changes
  const subscribe = useCallback(() => {
    if (!userId || !enabled) {
      console.log('[useSupabaseNotifications] Not subscribing - userId:', userId, 'enabled:', enabled);
      return;
    }

    // Clean up existing channel
    if (channelRef.current) {
      console.log('[useSupabaseNotifications] Removing existing channel');
      supabase.removeChannel(channelRef.current);
    }

    console.log('[useSupabaseNotifications] Creating subscription for user:', userId);

    const channel = supabase
      .channel(`notifications:${userId}:${Date.now()}`)
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
            isNew: true, // Mark as new for highlighting
          };

          // Add to the beginning of the list
          setNotifications((prev) => {
            // Check if already exists
            if (prev.some((n) => n.id === newNotification.id)) {
              return prev;
            }
            return [newNotification, ...prev];
          });

          // Remove the "new" highlight after 5 seconds
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
        if (err) {
          console.error('[useSupabaseNotifications] Subscription error:', err);
          setError(String(err));
        }
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
  }, [userId, enabled]);

  // Initial fetch and subscribe
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

  // Reconnect when app becomes active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && userId && enabled) {
        console.log('[useSupabaseNotifications] App active, resubscribing...');
        subscribe();
      }
    });
    return () => subscription.remove();
  }, [userId, enabled, subscribe]);

  // Mark single notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: 'read' } : n))
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })));
  }, []);

  // Calculate unread count
  const unreadCount = notifications.filter(
    (n) => n.status !== 'read' && n.status !== 'delivered'
  ).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    isConnected,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}

export default useSupabaseNotifications;
