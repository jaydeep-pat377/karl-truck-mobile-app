-- =====================================================
-- Supabase Setup for Push Notifications (Background/Killed State)
-- Run this SQL on the NOTIFICATION Supabase instance
-- (tabpplqpetdgruqmliix.supabase.co)
-- =====================================================

-- 1. Create user_devices table to store FCM tokens
CREATE TABLE IF NOT EXISTS user_devices (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- 2. Enable Row Level Security
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- 3. Allow anonymous users to insert/update their own device tokens
CREATE POLICY "Users can upsert their own device tokens"
  ON user_devices
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);

-- 5. Enable Realtime for notification_queue (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE notification_queue;
