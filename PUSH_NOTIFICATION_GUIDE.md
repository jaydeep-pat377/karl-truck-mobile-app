# Push Notification Guide - TruckAst Mobile App

## Table of Contents

1. [Current Status](#current-status)
2. [Architecture Overview](#architecture-overview)
3. [How Each App State Works](#how-each-app-state-works)
4. [The Core Problem](#the-core-problem)
5. [Solution: Supabase Edge Function + FCM](#solution-supabase-edge-function--fcm)
6. [Client-Side Changes (DONE)](#client-side-changes-done)
7. [Server-Side Changes (PENDING)](#server-side-changes-pending)
8. [FCM Payload Format](#fcm-payload-format)
9. [File Reference](#file-reference)
10. [Step-by-Step Deployment Guide](#step-by-step-deployment-guide)
11. [Testing Guide](#testing-guide)
12. [Troubleshooting](#troubleshooting)

---

## Current Status

| App State       | Status  | How It Works                                      |
|-----------------|---------|---------------------------------------------------|
| **Foreground**  | WORKING | Supabase Realtime (WebSocket) + Notifee display   |
| **Background**  | PENDING | Needs Supabase Edge Function deployed (server-side)|
| **Killed/Quit** | PENDING | Needs Supabase Edge Function deployed (server-side)|

### What's Done (Client-Side - Mobile App)

- [x] FCM token obtained on app launch (Android + iOS)
- [x] FCM token synced to backend API (`POST /auth/device-token`)
- [x] FCM token synced to Supabase `notification_queue.recipient_device_token`
- [x] Supabase Realtime subscription for foreground notifications
- [x] Notifee local push display in foreground
- [x] Background message handler in `index.js` (ready to receive FCM)
- [x] Killed state handler via `getInitialNotification()` (ready to receive FCM)
- [x] Notification tap navigation to correct screen
- [x] Deduplication (skip Edge Function FCM in foreground since Realtime handles it)
- [x] Sound playback on new notifications
- [x] Edge Function code written and ready to deploy

### What's Pending (Server-Side - Supabase Dashboard)

- [ ] Deploy the Edge Function to Supabase
- [ ] Set `FCM_SERVER_KEY` secret in Supabase
- [ ] Create Database Webhook on `notification_queue` INSERT
- [ ] Test background + killed state delivery

---

## Architecture Overview

```
                    NOTIFICATION FLOW
                    =================

  Backend/API inserts row into notification_queue table
                         |
                         v
            ┌────────────────────────┐
            │   Supabase Database    │
            │   notification_queue   │
            │   (INSERT trigger)     │
            └──────┬─────────┬───────┘
                   │         │
         ┌─────────┘         └──────────┐
         v                              v
  ┌──────────────┐            ┌──────────────────┐
  │  Supabase    │            │  Database Webhook │
  │  Realtime    │            │  (on INSERT)      │
  │  (WebSocket) │            └────────┬──────────┘
  └──────┬───────┘                     │
         │                             v
         │                   ┌──────────────────┐
         │                   │ Edge Function:    │
         │                   │ send-push-notif.  │
         │                   │                   │
         │                   │ Reads device token│
         │                   │ from record       │
         │                   └────────┬──────────┘
         │                            │
         │                            v
         │                   ┌──────────────────┐
         │                   │ FCM (Firebase)    │
         │                   │ Push Notification │
         │                   │                   │
         │                   │ notification: {}  │
         │                   │ data: {}          │
         │                   │ android: {}       │
         │                   │ apns: {}          │
         │                   └────────┬──────────┘
         │                            │
         v                            v
  ┌────────────┐            ┌────────────────────┐
  │ FOREGROUND │            │ BACKGROUND / KILLED │
  │            │            │                     │
  │ WebSocket  │            │ OS receives FCM     │
  │ delivers   │            │ Shows notification  │
  │ instantly  │            │ in system tray      │
  │            │            │ automatically       │
  │ App shows  │            │                     │
  │ via Notifee│            │ On tap → app opens  │
  │ + sound    │            │ → navigates to      │
  │            │            │   correct screen    │
  └────────────┘            └────────────────────┘
```

### Two Notification Systems

| System              | Transport  | Works When          | Purpose                     |
|---------------------|-----------|---------------------|-----------------------------|
| Supabase Realtime   | WebSocket | App is OPEN (active)| Instant in-app notifications|
| FCM via Edge Func.  | Push      | App is CLOSED/KILLED| OS-level push notifications |

---

## How Each App State Works

### Foreground (WORKING)

```
1. New row INSERT into notification_queue
2. Supabase Realtime WebSocket delivers event to app
3. useSupabaseNotifications receives INSERT payload
4. App plays notification sound
5. App displays local notification via Notifee
6. Notification appears in notification list
7. FCM message from Edge Function is SKIPPED (deduplication)
```

**Files involved:**
- `src/hooks/useSupabaseNotifications.ts` - Realtime subscription + local display
- `src/hooks/useRealtimeSubscription.ts` - Used by NotificationProvider
- `src/providers/NotificationProvider.tsx` - Orchestrates sound + display
- `src/services/notificationService.ts` - Skips Edge Function FCM (`source === 'supabase_edge_function'`)

### Background (PENDING - needs Edge Function deployed)

```
1. New row INSERT into notification_queue
2. Database Webhook triggers Edge Function
3. Edge Function reads recipient_device_token from record
4. Edge Function sends FCM push with notification + data payload
5. Android/iOS OS receives FCM push
6. OS automatically displays notification in system tray (notification payload)
7. index.js background handler adds to notification store
8. User taps notification → app opens → navigates to correct screen
```

**Files involved:**
- `supabase/functions/send-push-notification/index.ts` - Edge Function (NEEDS DEPLOY)
- `index.js` - Background message handler (READY)
- `src/services/notificationService.ts` - `onNotificationOpenedApp` handles tap

### Killed/Quit (PENDING - needs Edge Function deployed)

```
1. New row INSERT into notification_queue
2. Database Webhook triggers Edge Function
3. Edge Function sends FCM push with notification + data payload
4. Android/iOS OS receives FCM push
5. OS displays notification in system tray
6. User taps notification → app cold starts
7. getInitialNotification() reads the FCM message
8. App navigates to correct screen based on event_code
```

**Files involved:**
- `supabase/functions/send-push-notification/index.ts` - Edge Function (NEEDS DEPLOY)
- `src/services/notificationService.ts` - `checkInitialNotification()` handles cold start tap

---

## The Core Problem

**Supabase Realtime = WebSocket = Only works when app is open.**

When the app goes to background or is killed:
- WebSocket connection is disconnected by the OS
- No Supabase Realtime events are received
- User misses all notifications until they open the app again

**The fix:** When a new notification is inserted into `notification_queue`, a Supabase Edge Function sends an FCM push notification to the user's device. FCM is handled by the OS at the system level, so it works in ALL app states.

---

## Solution: Supabase Edge Function + FCM

### How Device Token Gets to Supabase

The mobile app syncs the FCM device token to `notification_queue.recipient_device_token` in 3 ways:

1. **On login/app launch** - `syncDeviceTokenToSupabase()` updates ALL existing records with null token
2. **On each new realtime notification** - `updateNotificationDeviceToken()` updates the new record immediately
3. **On FCM token refresh** - Token refresh handler syncs to both backend API and Supabase

### How Edge Function Finds the Token

When a new notification is inserted:
1. First checks `recipient_device_token` on the NEW record itself
2. If null, looks up from OTHER `notification_queue` records for the same `user_id`
3. Skips invalid tokens (`pending_*`, `fallback_*`)

### Deduplication Strategy

| App State  | Supabase Realtime | FCM from Edge Function | Which Shows? |
|-----------|-------------------|----------------------|-------------|
| Foreground | YES (WebSocket)   | YES (received)       | Realtime only (FCM skipped) |
| Background | NO (disconnected) | YES (OS shows)       | FCM only |
| Killed     | NO (disconnected) | YES (OS shows)       | FCM only |

---

## Client-Side Changes (DONE)

### 1. `src/lib/notification-client.ts`

**Added:** `syncDeviceTokenToSupabase()` - Bulk updates all user's notification records with FCM token
**Added:** `updateNotificationDeviceToken()` - Updates single new notification record with FCM token

### 2. `src/hooks/useNotifications.ts`

**Changed:** After successful API token sync, also syncs FCM token to Supabase via `syncDeviceTokenToSupabase()`

### 3. `src/services/notificationService.ts`

**Changed:** Foreground FCM handler skips messages with `source: 'supabase_edge_function'` (deduplication)
**Changed:** Token refresh handler syncs to Supabase via `syncDeviceTokenToSupabase()`

### 4. `src/hooks/useSupabaseNotifications.ts`

**Changed:** On INSERT event, calls `updateNotificationDeviceToken()` to sync token to new record
**Changed:** Foreground-only local notification display (background handled by Edge Function)

### 5. `src/hooks/useRealtimeSubscription.ts`

**Changed:** On INSERT event, calls `updateNotificationDeviceToken()` to sync token to new record

### 6. `src/providers/NotificationProvider.tsx`

**Changed:** Shows local notification only in foreground (Edge Function handles background)
**Changed:** Refetches missed notifications when app returns to foreground

### 7. `index.js`

**Changed:** Background handler uses correct Android channel IDs based on event_code
**Changed:** Uses `queue_uuid` as notification ID for deduplication

### 8. `App.tsx`

**Changed:** Added `NotificationProvider` wrapping `RootNavigator` with userId, tenantId, auth state

---

## Server-Side Changes (PENDING)

### What Needs to Be Done on Supabase Dashboard

**Supabase Instance:** `tabpplqpetdgruqmliix.supabase.co` (Notification instance)

#### Step 1: Deploy Edge Function

```bash
cd /path/to/project

# Link to notification Supabase project
npx supabase link --project-ref tabpplqpetdgruqmliix

# Deploy the edge function
npx supabase functions deploy send-push-notification

# Set FCM server key secret
npx supabase secrets set FCM_SERVER_KEY='YOUR_FCM_SERVER_KEY_HERE'
```

**Where to get FCM Server Key:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `truckast-app`
3. Project Settings (gear icon) → Cloud Messaging tab
4. Copy the **Server key** (or **Legacy server key**)

#### Step 2: Create Database Webhook

1. Go to Supabase Dashboard → Database → Webhooks
2. Click "Create a new webhook"
3. Configure:
   - **Name:** `send-push-on-new-notification`
   - **Table:** `notification_queue`
   - **Events:** `INSERT` only
   - **Type:** Supabase Edge Functions
   - **Edge Function:** `send-push-notification`
   - **HTTP Method:** POST
4. Save

#### Step 3: Verify Realtime is Enabled

Run in SQL Editor:
```sql
-- Check if notification_queue is in realtime publication
SELECT * FROM pg_publication_tables WHERE tablename = 'notification_queue';

-- If not, add it:
ALTER PUBLICATION supabase_realtime ADD TABLE notification_queue;
```

---

## FCM Payload Format

The Edge Function sends this exact payload to FCM:

```json
{
  "to": "FCM_DEVICE_TOKEN",
  "priority": "high",

  "notification": {
    "title": "New Order #12345",
    "body": "Test notification - Dolese Ready Mix OKC",
    "sound": "default"
  },

  "data": {
    "notification_id": "128",
    "queue_uuid": "6034d627-1986-48e0-b923-13628c94d091",
    "event_code": "ORDER_CREATED",
    "event_name": "Order Created",
    "entity_type": "order",
    "entity_id": "456",
    "priority": "5",
    "tenant_id": "1",
    "customer_name": "Dolese Bros. Co.",
    "source": "supabase_edge_function"
  },

  "android": {
    "priority": "high",
    "notification": {
      "channel_id": "orders",
      "sound": "default"
    }
  },

  "apns": {
    "headers": {
      "apns-priority": "10"
    },
    "payload": {
      "aps": {
        "sound": "default",
        "badge": 1,
        "content-available": 1
      }
    }
  }
}
```

### Why This Payload Works for All States

| Field | Purpose |
|-------|---------|
| `notification.title` + `notification.body` | OS displays this automatically in background/killed |
| `notification.sound` | Plays default notification sound |
| `data.*` | App reads this for navigation on tap |
| `data.source` | Used for deduplication in foreground |
| `android.priority: "high"` | Wakes Android from Doze mode |
| `android.notification.channel_id` | Routes to correct notification channel |
| `apns.headers.apns-priority: "10"` | Immediate delivery on iOS |
| `apns.payload.aps.content-available: 1` | Wakes iOS app for background processing |

### Android Notification Channels

| Channel ID | Name | Importance | Used For |
|-----------|------|------------|---------|
| `orders` | Orders | HIGH | ORDER_CREATED, ORDER_UPDATED, etc. |
| `trucks` | Trucks | HIGH | TRUCK_DISPATCHED, DELIVERY_STARTED, etc. |
| `alerts` | Alerts | MAX | PSI_ALERT, WEATHER_ALERT, etc. |
| `general` | General | DEFAULT | All other notifications |

---

## File Reference

### Client-Side Files

| File | Role |
|------|------|
| `index.js` | FCM background message handler (runs when app is backgrounded/killed) |
| `App.tsx` | Root component, mounts NotificationProvider |
| `src/services/notificationService.ts` | FCM token management, foreground handler, navigation |
| `src/lib/notification-client.ts` | Supabase notification client, token sync functions |
| `src/hooks/useNotifications.ts` | Initializes FCM, requests permissions, syncs token |
| `src/hooks/useSupabaseNotifications.ts` | Supabase Realtime subscription (used by NotificationScreen) |
| `src/hooks/useRealtimeSubscription.ts` | Supabase Realtime subscription (used by NotificationProvider) |
| `src/hooks/useLocalPushNotifications.ts` | Notifee local push display helper |
| `src/providers/NotificationProvider.tsx` | Notification context provider, orchestrates all systems |
| `src/store/notificationStore.ts` | Zustand store for notification state |
| `src/services/navigationService.ts` | Navigation from notification taps |
| `src/utils/notificationSound.ts` | Sound playback utility |

### Server-Side Files

| File | Role | Status |
|------|------|--------|
| `supabase/functions/send-push-notification/index.ts` | Edge Function to send FCM push | READY TO DEPLOY |
| `supabase/setup.sql` | Setup instructions for Supabase Dashboard | REFERENCE ONLY |

### Database Schema

**Table:** `notification_queue` (Supabase: `tabpplqpetdgruqmliix`)

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Primary key |
| `queue_uuid` | uuid | Stable unique ID |
| `user_id` | text | Target user |
| `subject` | text | Notification title |
| `body` | text | Notification body |
| `event_code` | text | ORDER_CREATED, TRUCK_DISPATCHED, etc. |
| `entity_type` | text | order, truck, etc. |
| `entity_id` | text | Reference ID |
| `priority` | int | 0-10 (8+ = high) |
| `status` | text | pending/sent/delivered/read |
| `tenant_id` | int | Multi-tenant ID |
| `recipient_device_token` | text | FCM token (synced by mobile app) |
| `push_sent` | boolean | Whether push was sent by Edge Function |
| `push_sent_at` | timestamp | When push was sent |
| `push_token_used` | text | Which token/platform was used |

---

## Step-by-Step Deployment Guide

### Prerequisites

- Access to Supabase Dashboard for `tabpplqpetdgruqmliix`
- Access to Firebase Console for `truckast-app`
- Supabase CLI installed (`npx supabase`)

### Step 1: Get FCM Server Key

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select project **truckast-app**
3. Click gear icon → **Project Settings**
4. Go to **Cloud Messaging** tab
5. Copy the **Server key** (long string starting with `AAAA...`)

### Step 2: Deploy Edge Function

```bash
# Navigate to project
cd /Volumes/ExtremePro/ReactNative/karl-truck-mobile-app

# Link to the notification Supabase project
npx supabase link --project-ref tabpplqpetdgruqmliix

# Deploy the function
npx supabase functions deploy send-push-notification

# Set the FCM server key
npx supabase secrets set FCM_SERVER_KEY='AAAA...your_server_key_here'
```

### Step 3: Create Database Webhook

1. Go to `https://supabase.com/dashboard/project/tabpplqpetdgruqmliix`
2. Navigate to **Database** → **Webhooks**
3. Click **Create a new webhook**
4. Set:
   - Name: `send-push-on-new-notification`
   - Table: `notification_queue`
   - Events: **INSERT** (only)
   - Type: **Supabase Edge Functions**
   - Function: `send-push-notification`
5. Click **Create webhook**

### Step 4: Test

1. Open the app on a real device
2. Log in and verify FCM token in Metro logs:
   ```
   [Notifications] FCM TOKEN: dK7x...real_token
   [Notifications] Token sync successful
   [NotificationClient] Device token synced to N notification records
   ```
3. Put the app in background
4. Insert a test notification in Supabase SQL Editor:
   ```sql
   INSERT INTO notification_queue (
     user_id, subject, body, event_code, event_name,
     entity_type, priority, status, tenant_id, scheduled_at
   ) VALUES (
     'YOUR_USER_ID',
     'Test Background Push',
     'This should appear in the system tray!',
     'ORDER_CREATED',
     'Order Created',
     'order',
     5,
     'pending',
     1,
     NOW()
   );
   ```
5. Verify notification appears in the system tray

---

## Testing Guide

### Test 1: Foreground (Already Working)

1. Open app, stay on any screen
2. Insert notification via Supabase SQL Editor
3. Expected: Green notification banner appears at top + sound plays

### Test 2: Background (After Edge Function Deploy)

1. Open app, then press Home button (app goes to background)
2. Insert notification via Supabase SQL Editor
3. Expected: Notification appears in Android/iOS system tray with sound
4. Tap notification → app opens → navigates to correct screen

### Test 3: Killed State (After Edge Function Deploy)

1. Open app, then force close it (swipe away from recent apps)
2. Insert notification via Supabase SQL Editor
3. Expected: Notification appears in system tray with sound
4. Tap notification → app cold starts → navigates to correct screen

### Test 4: Token Persistence

1. Log in on the app
2. Check Supabase: `SELECT recipient_device_token FROM notification_queue WHERE user_id = 'xxx' LIMIT 5`
3. Expected: FCM token should be populated on records

---

## Troubleshooting

### Notification not showing in background

| Check | How |
|-------|-----|
| Edge Function deployed? | `npx supabase functions list` |
| FCM_SERVER_KEY set? | `npx supabase secrets list` |
| Database Webhook created? | Supabase Dashboard → Database → Webhooks |
| Device token on record? | `SELECT recipient_device_token FROM notification_queue WHERE id = X` |
| Edge Function logs? | Supabase Dashboard → Edge Functions → Logs |

### FCM token is null/placeholder

| Cause | Fix |
|-------|-----|
| Running on iOS Simulator | Use a real iOS device |
| Permission not granted | Check Settings → App → Notifications |
| APNS token not ready (iOS) | `waitForApnsToken()` retries 5 times |

### Edge Function returns "no_device_token"

The user's `notification_queue` records don't have a `recipient_device_token`. This means:
1. User hasn't opened the app since the token sync code was deployed
2. Fix: User needs to log in again so the app syncs the FCM token to Supabase

### Duplicate notifications in foreground

If both Supabase Realtime AND FCM show a notification in foreground:
- Check that `notificationService.ts` has the `source === 'supabase_edge_function'` skip logic
- The Edge Function must include `source: 'supabase_edge_function'` in the data payload

---

## Supabase Instances

| Instance | URL | Purpose |
|----------|-----|---------|
| Main (Chat) | `lwplbyltqsfmfvsgmrjq.supabase.co` | Chat, general features |
| Notifications | `tabpplqpetdgruqmliix.supabase.co` | Notification queue, realtime |

## Backend API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/device-token` | POST | Sync FCM token to backend |
| `/auth/login` | POST | Login (includes device_info.device_token) |
| `/notification-queue` | GET | Fetch notification history |
