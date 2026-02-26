-- =====================================================
-- Supabase Setup for Push Notifications (Background/Killed State)
-- Run on NOTIFICATION Supabase instance (tabpplqpetdgruqmliix.supabase.co)
-- =====================================================

-- No new tables needed! We use the existing notification_queue table.
--
-- The mobile app syncs FCM device tokens to notification_queue.recipient_device_token
-- The Edge Function reads this token when sending FCM push notifications.
--
-- Columns already present in notification_queue:
--   recipient_device_token  → FCM device token (synced by mobile app)
--   push_sent               → Whether push was sent
--   push_sent_at            → When push was sent
--   push_token_used         → Which token was used to send

-- 1. Create Database Webhook (do this in Supabase Dashboard):
--    - Go to Database → Webhooks
--    - Table: notification_queue
--    - Events: INSERT
--    - Type: Supabase Edge Function
--    - Function: send-push-notification
--
-- 2. Deploy the Edge Function:
--    supabase functions deploy send-push-notification
--
-- 3. Set the FCM Server Key secret:
--    supabase secrets set FCM_SERVER_KEY='your-firebase-server-key'
--
--    Get the FCM Server Key from:
--    Firebase Console → Project Settings → Cloud Messaging → Server key

-- Enable Realtime for notification_queue (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE notification_queue;
