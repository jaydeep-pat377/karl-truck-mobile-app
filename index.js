import { AppRegistry, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AndroidVisibility,
  EventType,
} from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// Channel ID for notifications - using HIGH importance for heads-up
const CHANNEL_ID = 'truckast_heads_up';

/**
 * Create notification channel with HIGH importance for heads-up display
 * Must be called before any notification is displayed
 */
async function createNotificationChannel() {
  if (Platform.OS === 'android') {
    try {
      // Create channel with HIGH importance for heads-up notifications
      const channelId = await notifee.createChannel({
        id: CHANNEL_ID,
        name: 'TruckAst Alerts',
        description: 'Important alerts that appear on screen',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: 'default',
        vibration: true,
        lights: true,
        badge: true,
      });
      console.log('[Notifee] Channel created:', channelId);
      return channelId;
    } catch (error) {
      console.error('[Notifee] Error creating channel:', error);
    }
  }
  return CHANNEL_ID;
}

/**
 * Display notification using Notifee
 * This ensures heads-up display regardless of FCM priority
 */
async function displayNotification(title, body, data = {}) {
  try {
    // Ensure channel exists
    await createNotificationChannel();

    // Generate unique ID to avoid duplicates
    const notificationId = `notif_${Date.now()}`;

    const notification = {
      id: notificationId,
      title,
      body,
      data,
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        pressAction: {
          id: 'default',
        },
        smallIcon: 'ic_launcher',
        sound: 'default',
        vibrationPattern: [300, 500],
        lights: ['#FF0000', 300, 600],
        // This ensures heads-up even if priority is normal
        autoCancel: true,
        showTimestamp: true,
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
    };

    const displayedId = await notifee.displayNotification(notification);
    console.log('[Notifee] Notification displayed:', displayedId);
    return displayedId;
  } catch (error) {
    console.error('[Notifee] Error displaying notification:', error);
    return null;
  }
}

// Create channel immediately on app load
createNotificationChannel();

// Handle Notifee background events (notification press, dismiss, etc.)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('[Notifee] Background event:', EventType[type], detail);

  switch (type) {
    case EventType.PRESS:
      console.log('[Notifee] Notification pressed in background');
      // Navigation will be handled when app opens
      break;
    case EventType.DISMISSED:
      console.log('[Notifee] Notification dismissed');
      break;
  }
});

/**
 * FCM Background Message Handler
 *
 * STRATEGY:
 * - For DATA-ONLY messages: FCM does NOT display anything, so we display via Notifee
 * - For messages WITH notification payload: FCM auto-displays before this handler runs
 *   We DON'T cancel or re-display to avoid race conditions and duplicates.
 *
 * RECOMMENDATION: Use DATA-ONLY payloads from backend for full control over display.
 */
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM] Background message received:', JSON.stringify(remoteMessage, null, 2));

  const { notification, data, messageId, sentTime } = remoteMessage;

  // For messages WITH notification payload, FCM already displayed it
  // Just store it and exit - don't try to cancel/re-display (causes race conditions)
  if (notification) {
    console.log('[FCM] Message has notification payload - FCM auto-displayed');

    // Store in notification store
    try {
      const { useNotificationStore } = require('./src/store/notificationStore');
      useNotificationStore.getState().addNotification({
        id: messageId || Date.now().toString(),
        type: data?.type || 'system',
        title: notification.title || '',
        body: notification.body || '',
        priority: data?.priority || 'medium',
        isRead: false,
        data: data || {},
        orderId: data?.orderId,
        truckId: data?.truckId,
        deepLink: data?.deepLink,
        createdAt: sentTime
          ? new Date(sentTime).toISOString()
          : new Date().toISOString(),
      });
    } catch (e) {
      console.log('[FCM] Store error:', e.message);
    }

    return; // Let FCM's auto-displayed notification show
  }

  // DATA-ONLY message: FCM won't display anything, so we must display via Notifee
  const title = data?.title || '';
  const body = data?.body || '';

  if (!title && !body) {
    console.log('[FCM] Data-only message with no title/body, skipping display');
    return;
  }

  console.log('[FCM] Data-only message - displaying via Notifee');

  // Store in notification store
  try {
    const { useNotificationStore } = require('./src/store/notificationStore');
    useNotificationStore.getState().addNotification({
      id: messageId || Date.now().toString(),
      type: data?.type || 'system',
      title,
      body,
      priority: data?.priority || 'medium',
      isRead: false,
      data: data || {},
      orderId: data?.orderId,
      truckId: data?.truckId,
      deepLink: data?.deepLink,
      createdAt: sentTime
        ? new Date(sentTime).toISOString()
        : new Date().toISOString(),
    });
  } catch (e) {
    console.log('[FCM] Store error:', e.message);
  }

  // Display via Notifee with HIGH importance
  await displayNotification(title, body, data || {});
});

AppRegistry.registerComponent(appName, () => App);
