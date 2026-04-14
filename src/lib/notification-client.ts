
import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { AppState, AppStateStatus } from 'react-native';

const NOTIFICATION_URL = 'https://tabpplqpetdgruqmliix.supabase.co';
const NOTIFICATION_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhYnBwbHFwZXRkZ3J1cW1saWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzMxNTgsImV4cCI6MjA4MjA0OTE1OH0.JqG84aRxD88qT1rlY_Rbe2r8QSX9U_ksP3IV9RqYSZg';

const notificationSupabase: SupabaseClient = createClient(NOTIFICATION_URL, NOTIFICATION_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

export async function testNotificationConnection(userId: string): Promise<boolean> {
  try {
    const { data, error } = await notificationSupabase
      .from('notification_queue')
      .select('id, subject')
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('[NotificationClient] REST API exception:', err.message);
    return false;
  }
}

export function subscribeToNotifications(
  userId: string,
  tenantId: number | null,
  onInsert: (payload: any) => void,
  onStatusChange: (status: string) => void
): RealtimeChannel {
  const channelName = `notifications:${userId}`;
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
      if (err) {
        console.error('[NotificationClient] Subscription error:', err.message);
      }
      onStatusChange(status);
    });

  return channel;
}

export function unsubscribeFromNotifications(channel: RealtimeChannel): void {
  if (channel) {
    notificationSupabase.removeChannel(channel);
  }
}

AppState.addEventListener('change', (state: AppStateStatus) => {
  if (state === 'active') {
    // App became active
  }
});

export { notificationSupabase };
