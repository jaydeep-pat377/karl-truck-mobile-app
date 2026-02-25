/**
 * Notification Supabase Client
 *
 * Separate Supabase instance for real-time notifications.
 */
import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { AppState, AppStateStatus } from 'react-native';

// Supabase credentials
const NOTIFICATION_URL = 'https://tabpplqpetdgruqmliix.supabase.co';
const NOTIFICATION_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhYnBwbHFwZXRkZ3J1cW1saWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzMxNTgsImV4cCI6MjA4MjA0OTE1OH0.JqG84aRxD88qT1rlY_Rbe2r8QSX9U_ksP3IV9RqYSZg';

console.log('[NotificationClient] Initializing...');

// Create the Supabase client
const notificationSupabase: SupabaseClient = createClient(NOTIFICATION_URL, NOTIFICATION_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

console.log('[NotificationClient] Client created');

// Test function to verify REST API connection
export async function testNotificationConnection(userId: string): Promise<boolean> {
  try {
    console.log('[NotificationClient] Testing REST API connection for user:', userId);

    const { data, error } = await notificationSupabase
      .from('notification_queue')
      .select('id, subject')
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      console.error('[NotificationClient] REST API error:', error.message);
      return false;
    }

    console.log('[NotificationClient] REST API works! Found:', data?.length || 0, 'notifications');
    return true;
  } catch (err: any) {
    console.error('[NotificationClient] REST API exception:', err.message);
    return false;
  }
}

// Subscribe to real-time notifications for a user
export function subscribeToNotifications(
  userId: string,
  tenantId: number | null,
  onInsert: (payload: any) => void,
  onStatusChange: (status: string) => void
): RealtimeChannel {
  console.log('[NotificationClient] Creating subscription for user:', userId);

  const channelName = `notifications:${userId}`;

  // Remove any existing channel with same name
  const existingChannel = notificationSupabase.channel(channelName);
  if (existingChannel) {
    notificationSupabase.removeChannel(existingChannel);
  }

  const channel = notificationSupabase
    .channel(channelName, {
      config: {
        broadcast: { self: true },
        presence: { key: userId },
      },
    })
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notification_queue',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('[NotificationClient] INSERT received:', payload);
        onInsert(payload);
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
        console.log('[NotificationClient] UPDATE received:', payload);
      }
    )
    .subscribe((status, err) => {
      console.log('[NotificationClient] Subscription status:', status);
      if (err) {
        console.error('[NotificationClient] Subscription error:', err.message);
      }
      onStatusChange(status);
    });

  return channel;
}

// Unsubscribe from a channel
export function unsubscribeFromNotifications(channel: RealtimeChannel): void {
  if (channel) {
    console.log('[NotificationClient] Unsubscribing from channel');
    notificationSupabase.removeChannel(channel);
  }
}

// Reconnect when app comes to foreground
AppState.addEventListener('change', (state: AppStateStatus) => {
  if (state === 'active') {
    console.log('[NotificationClient] App active');
  }
});

export { notificationSupabase };
