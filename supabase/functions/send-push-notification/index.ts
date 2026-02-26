/**
 * Supabase Edge Function: send-push-notification
 *
 * Triggered by a Database Webhook on INSERT into notification_queue.
 * Sends an FCM push notification to the user's device so they receive
 * notifications even when the app is in background or killed.
 *
 * PAYLOAD FORMAT:
 * Sends BOTH `notification` (for OS-level display) and `data` (for app-level handling).
 * - notification: title + body + sound → OS shows this in background/killed state
 * - data: event_code, entity_id, etc. → app uses for navigation on tap
 * - android: priority "high" → ensures delivery even in Doze mode
 * - apns: apns-priority "10" + content-available → ensures iOS delivery
 *
 * Setup:
 * 1. Deploy: supabase functions deploy send-push-notification
 * 2. Set secret: supabase secrets set FCM_SERVER_KEY='your-firebase-server-key'
 * 3. Create Database Webhook on notification_queue INSERT → this function URL
 *
 * Get FCM Server Key from:
 * Firebase Console → Project Settings → Cloud Messaging → Server key
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')!;

// Legacy FCM HTTP API endpoint
const FCM_API_URL = 'https://fcm.googleapis.com/fcm/send';

interface NotificationRecord {
  id: string;
  queue_uuid: string;
  user_id: string;
  subject: string;
  body: string;
  event_code: string;
  event_name: string;
  entity_type: string;
  entity_id: string | null;
  priority: number;
  status: string;
  tenant_id: number | null;
  recipient_device_token: string | null;
  customer_name: string | null;
  created_at: string;
}

/**
 * Determine Android notification channel based on event code
 */
function getAndroidChannelId(eventCode: string): string {
  const code = (eventCode || '').toUpperCase();
  if (code.includes('ALERT') || code.includes('WEATHER')) return 'alerts';
  if (code.includes('ORDER')) return 'orders';
  if (code.includes('TRUCK') || code.includes('DELIVERY')) return 'trucks';
  return 'general';
}

/**
 * Send FCM push notification with proper notification + data payload
 *
 * IMPORTANT: The payload includes BOTH `notification` and `data`:
 * - `notification` → OS displays the notification in background/killed state
 * - `data` → App receives and processes on tap / in foreground
 * - `android.priority: "high"` → Wakes the device from Doze mode
 * - `apns.headers.apns-priority: "10"` → Immediate delivery on iOS
 * - `apns.payload.aps.content-available: 1` → Wakes iOS app for processing
 */
async function sendFCMNotification(
  deviceToken: string,
  notification: NotificationRecord
): Promise<boolean> {
  const channelId = getAndroidChannelId(notification.event_code);

  // Build the FCM payload with BOTH notification and data
  const fcmPayload = {
    to: deviceToken,
    priority: 'high',

    // Notification payload - OS displays this in background/killed state
    notification: {
      title: notification.subject || 'New Notification',
      body: notification.body || '',
      sound: 'default',
    },

    // Data payload - app processes this for navigation/state updates
    data: {
      notification_id: String(notification.id),
      queue_uuid: notification.queue_uuid || '',
      event_code: notification.event_code || '',
      event_name: notification.event_name || '',
      entity_type: notification.entity_type || '',
      entity_id: String(notification.entity_id || ''),
      priority: String(notification.priority || 5),
      tenant_id: String(notification.tenant_id || ''),
      customer_name: notification.customer_name || '',
      source: 'supabase_edge_function',
    },

    // Android-specific: high priority wakes device from Doze mode
    android: {
      priority: 'high',
      notification: {
        channel_id: channelId,
        sound: 'default',
      },
    },

    // iOS/APNs-specific: immediate delivery + background wake
    apns: {
      headers: {
        'apns-priority': '10',
      },
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          'content-available': 1,
        },
      },
    },
  };

  console.log('Sending FCM payload:', JSON.stringify({
    to: deviceToken.substring(0, 20) + '...',
    priority: fcmPayload.priority,
    notification: fcmPayload.notification,
    data_keys: Object.keys(fcmPayload.data),
    android: fcmPayload.android,
    apns: fcmPayload.apns,
  }));

  try {
    const response = await fetch(FCM_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmPayload),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      console.error(`FCM send failed (${response.status}):`, JSON.stringify(responseBody));
      return false;
    }

    // Check FCM response for delivery success
    if (responseBody.success === 1) {
      console.log('FCM notification sent successfully to:', deviceToken.substring(0, 20) + '...');
      return true;
    }

    // Handle specific FCM errors
    if (responseBody.results?.[0]?.error) {
      const fcmError = responseBody.results[0].error;
      console.error('FCM delivery error:', fcmError);

      // If token is invalid/expired, we could clean it up
      if (fcmError === 'NotRegistered' || fcmError === 'InvalidRegistration') {
        console.log('Device token is invalid, should be removed for user');
      }
      return false;
    }

    console.log('FCM response:', JSON.stringify(responseBody));
    return responseBody.success >= 1;
  } catch (error) {
    console.error('FCM send error:', error);
    return false;
  }
}

serve(async (req) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    const payload = await req.json();
    const record = payload.record as NotificationRecord;

    if (!record) {
      console.error('No record in webhook payload');
      return new Response(JSON.stringify({ error: 'No record in payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('=== Processing notification ===');
    console.log('ID:', record.id);
    console.log('User:', record.user_id);
    console.log('Event:', record.event_code);
    console.log('Subject:', record.subject);

    // 1. Try to get device token from the notification record itself
    let deviceToken = record.recipient_device_token;

    // 2. If no token in record, look up from user_devices table
    if (!deviceToken) {
      console.log('No token in record, looking up from user_devices...');
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: devices, error: lookupError } = await supabase
        .from('user_devices')
        .select('device_token, platform')
        .eq('user_id', record.user_id)
        .order('updated_at', { ascending: false });

      if (lookupError) {
        console.error('Device lookup error:', lookupError.message);
      }

      if (devices && devices.length > 0) {
        console.log(`Found ${devices.length} device(s) for user`);

        // Send to ALL user's devices (they might have both iOS and Android)
        const results = await Promise.all(
          devices
            .filter(d => d.device_token && !d.device_token.startsWith('pending_') && !d.device_token.startsWith('fallback_'))
            .map(async (device) => {
              console.log(`Sending to ${device.platform} device...`);
              return sendFCMNotification(device.device_token, record);
            })
        );

        const anySent = results.some(r => r === true);

        // Update notification status
        if (anySent) {
          const supabaseUpdate = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          await supabaseUpdate
            .from('notification_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', record.id);
        }

        return new Response(JSON.stringify({
          success: anySent,
          devices_sent: results.filter(r => r).length,
          devices_total: results.length,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.log('No devices found for user:', record.user_id);
      return new Response(JSON.stringify({ success: false, reason: 'no_device_found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Validate the device token
    if (deviceToken.startsWith('pending_') || deviceToken.startsWith('fallback_')) {
      console.log('Invalid device token (placeholder):', deviceToken.substring(0, 20));
      return new Response(JSON.stringify({ success: false, reason: 'placeholder_token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Send FCM notification
    const sent = await sendFCMNotification(deviceToken, record);

    // 5. Update notification status in database
    if (sent) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase
        .from('notification_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', record.id);
    }

    return new Response(JSON.stringify({ success: sent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
