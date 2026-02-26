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

/**
 * Sync FCM device token to Supabase notification_queue records.
 *
 * Updates all the user's notification_queue records that have a NULL
 * recipient_device_token with the current FCM token. This allows the
 * Supabase Edge Function (triggered on INSERT) to read the token from
 * existing records and send FCM push notifications for background/killed state.
 */
export async function syncDeviceTokenToSupabase(
  userId: string,
  deviceToken: string,
  platform: 'ios' | 'android'
): Promise<boolean> {
  try {
    if (!deviceToken || deviceToken.startsWith('pending_') || deviceToken.startsWith('fallback_')) {
      console.log('[NotificationClient] Skipping token sync - invalid token');
      return false;
    }

    console.log('[NotificationClient] Syncing device token to Supabase for user:', userId);

    // Update all notification_queue records for this user that don't have a device token
    const { error, count } = await notificationSupabase
      .from('notification_queue')
      .update({
        recipient_device_token: deviceToken,
        push_token_used: platform,
      })
      .eq('user_id', userId)
      .is('recipient_device_token', null);

    if (error) {
      console.error('[NotificationClient] Token sync error:', error.message);
      return false;
    }

    console.log('[NotificationClient] Device token synced to', count, 'notification records');
    return true;
  } catch (err: any) {
    console.error('[NotificationClient] Token sync exception:', err.message);
    return false;
  }
}

/**
 * Update a single notification's device token.
 * Called when a new realtime notification arrives to ensure the record
 * has the device token for Edge Function processing.
 */
export async function updateNotificationDeviceToken(
  notificationId: string,
  deviceToken: string
): Promise<void> {
  if (!deviceToken || deviceToken.startsWith('pending_') || deviceToken.startsWith('fallback_')) return;

  try {
    await notificationSupabase
      .from('notification_queue')
      .update({ recipient_device_token: deviceToken })
      .eq('id', notificationId)
      .is('recipient_device_token', null);
  } catch (err) {
    // Silent fail - not critical
    console.log('[NotificationClient] Failed to update single notification token');
  }
}

export { notificationSupabase };
