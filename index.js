import { AppRegistry, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AndroidVisibility,
  EventType,
} from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

const CHANNEL_ID = 'truckast_heads_up';
const CHAT_CHANNEL_ID = 'chat';

async function createNotificationChannel() {
  if (Platform.OS === 'android') {
    try {
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
      // Also create the chat channel up-front so killed-state pushes
      // referencing channelId='chat' render with HIGH importance.
      await notifee.createChannel({
        id: CHAT_CHANNEL_ID,
        name: 'Chat messages',
        description: 'New messages in order chats',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: 'default',
        vibration: true,
        badge: true,
      });
      return channelId;
    } catch (error) {
      console.error('[Notifee] Error creating channel:', error);
    }
  }
  return CHANNEL_ID;
}

async function displayNotification(title, body, data = {}) {
  try {
    await createNotificationChannel();

    // Stable id derived from message_id (or content hash fallback) so a
    // re-delivered FCM updates the existing banner in place instead of
    // stacking. Chat messages route to the chat channel; everything else
    // stays on truckast_heads_up.
    const isChat =
      data?.type === 'chat_message' ||
      data?.type === 'order_request_message' ||
      String(data?.event_code || '').toUpperCase().includes('CHAT') ||
      String(data?.event_code || '').toUpperCase().includes('MESSAGE');
    const channelId = isChat ? CHAT_CHANNEL_ID : CHANNEL_ID;
    const stableId = data?.message_id
      ? `msg_${data.message_id}`
      : data?.notification_id
        ? `notif_${data.notification_id}`
        : `notif_${Date.now()}`;

    const notification = {
      id: stableId,
      title,
      body,
      data,
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        pressAction: {
          id: 'default',
        },
        smallIcon: 'ic_notification',
        color: '#6BB130',
        sound: 'default',
        vibrationPattern: [300, 500],
        lights: ['#FF0000', 300, 600],
        autoCancel: true,
        showTimestamp: true,
        ...(data?.message_id ? { tag: `chat_msg_${data.message_id}` } : {}),
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
    return displayedId;
  } catch (error) {
    console.error('[Notifee] Error displaying notification:', error);
    return null;
  }
}

createNotificationChannel();

notifee.onBackgroundEvent(async ({ type, detail }) => {
  switch (type) {
    case EventType.PRESS:
      // Navigate to the relevant screen when user taps a background notification
      if (detail.notification?.data) {
        const { navigateFromNotification } = require('./src/services/navigationService');
        navigateFromNotification(detail.notification.data);
      }
      break;
    case EventType.DISMISSED:
      break;
  }
});

messaging().setBackgroundMessageHandler(async remoteMessage => {
  const { notification, data, messageId, sentTime } = remoteMessage;

  // Chat pushes arrive data-only on Android (see backend sendChatPush —
  // top-level `notification` was dropped so the FCM SDK doesn't
  // auto-render a banner that then competes with our notifee call).
  // Other notification senders (the web frontend's /api/notifications/send,
  // for example) still ship a top-level `notification`, in which case
  // the OS already drew the banner and we MUST NOT call displayNotification
  // here or the user gets two. We only display when no `notification`
  // field is present, falling back to title/body inside `data`.
  const title = notification?.title || data?.title || data?.sender_name || '';
  const body =
    notification?.body || data?.body || data?.message_preview || '';

  if (!title && !body) {
    return;
  }

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

  if (!notification) {
    await displayNotification(title, body, data || {});
  }
});

AppRegistry.registerComponent(appName, () => App);
