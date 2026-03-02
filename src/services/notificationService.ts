import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform } from 'react-native';
import { useNotificationStore } from '../store/notificationStore';
import { AppNotification, NotificationType } from '../types/notification';
import { navigateFromNotification, navigateToTab } from './navigationService';

const CHANNEL_ID = 'truckast_heads_up';

class NotificationService {
  private unsubscribeOnMessage: (() => void) | null = null;
  private unsubscribeOnTokenRefresh: (() => void) | null = null;
  private unsubscribeOnNotificationOpened: (() => void) | null = null;
  private channelCreated = false;

  async createNotificationChannel(): Promise<void> {
    if (Platform.OS === 'android' && !this.channelCreated) {
      try {
        await notifee.createChannel({
          id: CHANNEL_ID,
          name: 'TruckAst Notifications',
          description: 'Important notifications from TruckAst',
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
        });
        this.channelCreated = true;
        console.log('[Notifications] Notifee channel created:', CHANNEL_ID);
      } catch (error) {
        console.error('[Notifications] Error creating channel:', error);
      }
    }
  }

  async displayNotification(
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    try {
      console.log('[Notifications] displayNotification called:', { title, body });

      // Ensure channel exists
      await this.createNotificationChannel();

      // Display notification using Notifee
      const notificationId = await notifee.displayNotification({
        title,
        body,
        data,
        android: {
          channelId: CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          smallIcon: 'ic_launcher',
          sound: 'default',
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
      });

      console.log('[Notifications] Notification displayed with ID:', notificationId);
    } catch (error) {
      console.error('[Notifications] Error displaying notification:', error);
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      console.log('[Notifications] Requesting permission...');

      // Request FCM permission
      const authStatus = await messaging().requestPermission();
      console.log('[Notifications] FCM Auth status:', authStatus);

      // Also request Notifee permission
      const notifeeSettings = await notifee.requestPermission();
      console.log('[Notifications] Notifee permission:', notifeeSettings);

      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      console.log('[Notifications] Permission enabled:', enabled);

      if (enabled) {
        await this.createNotificationChannel();
      }

      return enabled;
    } catch (error) {
      console.log('[Notifications] Permission request error:', error);
      return false;
    }
  }

  private async waitForApnsToken(maxRetries = 5, delayMs = 1500): Promise<string | null> {
    for (let i = 0; i < maxRetries; i++) {
      const apnsToken = await messaging().getAPNSToken();
      if (apnsToken) {
        console.log(`[Notifications] APNS Token obtained on attempt ${i + 1}:`, apnsToken);
        return apnsToken;
      }
      console.log(`[Notifications] APNS Token not ready, retrying (${i + 1}/${maxRetries})...`);
      await new Promise<void>(resolve => setTimeout(() => resolve(), delayMs));
    }
    return null;
  }

  async getToken(): Promise<string | null> {
    try {
      // Return cached token if available
      const cachedToken = useNotificationStore.getState().fcmToken;
      if (cachedToken) {
        console.log('[Notifications] Using cached FCM token');
        return cachedToken;
      }

      console.log('[Notifications] Getting token for platform:', Platform.OS);

      if (Platform.OS === 'ios') {
        try {
          console.log('[Notifications] Registering for remote messages...');
          await messaging().registerDeviceForRemoteMessages();
          console.log('[Notifications] Registered for remote messages');

          const apnsToken = await this.waitForApnsToken();
          console.log('[Notifications] APNS Token:', apnsToken);

          if (!apnsToken) {
            console.log('[Notifications] No APNS token after retries - likely running on simulator');
            return null;
          }
        } catch (error) {
          console.log('[Notifications] iOS registration error:', error);
          return null;
        }
      }

      const token = await messaging().getToken();
      console.log('[Notifications] FCM Device Token:', token);
      useNotificationStore.getState().setFcmToken(token);
      return token;
    } catch (error) {
      console.log('[Notifications] Error getting token:', error);
      return null;
    }
  }

  async syncTokenToServer(_token?: string): Promise<boolean> {
    // Device token API is not available on the backend
    // Skip the API call until backend implements this endpoint
    return false;
  }

  setupListeners(): void {
    console.log('[Notifications] Setting up listeners...');

    // Handle foreground FCM messages
    this.unsubscribeOnMessage = messaging().onMessage(
      async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        console.log('[Notifications] Received foreground message:', JSON.stringify(remoteMessage, null, 2));

        const notification = this.parseRemoteMessage(remoteMessage);

        if (notification) {
          console.log('[Notifications] Parsed notification:', notification);
          useNotificationStore.getState().addNotification(notification);

          // Display notification using Notifee
          await this.displayNotification(
            notification.title,
            notification.body,
            remoteMessage.data as Record<string, string>,
          );
        } else {
          console.log('[Notifications] Using data-only message');
          const { data }: any = remoteMessage;
          if (data?.title && data?.body) {
            await this.displayNotification(
              data.title,
              data.body,
              data as Record<string, string>,
            );
          }
        }
      },
    );

    // Handle token refresh
    this.unsubscribeOnTokenRefresh = messaging().onTokenRefresh(
      async (token: string) => {
        console.log('[Notifications] Token refreshed, syncing...');
        useNotificationStore.getState().setFcmToken(token);
        await this.syncTokenToServer(token);
      },
    );

    // Handle notification opened from background
    this.unsubscribeOnNotificationOpened = messaging().onNotificationOpenedApp(
      (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        console.log('[Notifications] App opened from notification:', remoteMessage);
        const notification = this.parseRemoteMessage(remoteMessage);
        if (notification) {
          useNotificationStore.getState().addNotification(notification);
        }
        this.handleNotificationNavigation(remoteMessage);
      },
    );

    // Setup Notifee foreground event handler
    notifee.onForegroundEvent(({ type, detail }) => {
      console.log('[Notifee] Foreground event:', type, detail);

      if (type === EventType.PRESS) {
        const { notification } = detail;
        if (notification?.data) {
          navigateFromNotification(notification.data as Record<string, string>);
        } else {
          navigateToTab('Notifications');
        }
      }
    });
  }

  async checkInitialNotification(): Promise<void> {
    // Check FCM initial notification
    const remoteMessage = await messaging().getInitialNotification();
    if (remoteMessage) {
      console.log('[Notifications] FCM initial notification:', remoteMessage);
      const notification = this.parseRemoteMessage(remoteMessage);
      if (notification) {
        useNotificationStore.getState().addNotification(notification);
      }
      this.handleNotificationNavigation(remoteMessage);
      return;
    }

    // Check Notifee initial notification
    const initialNotification = await notifee.getInitialNotification();
    if (initialNotification) {
      console.log('[Notifee] Initial notification:', initialNotification);
      const { notification } = initialNotification;
      if (notification?.data) {
        navigateFromNotification(notification.data as Record<string, string>);
      } else {
        navigateToTab('Notifications');
      }
    }
  }

  parseRemoteMessage(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
  ): AppNotification | null {
    const { notification, data, messageId, sentTime } = remoteMessage;
    if (!notification) return null;

    return {
      id: messageId || Date.now().toString(),
      type: (data?.type as NotificationType) || 'system',
      title: notification.title || '',
      body: notification.body || '',
      priority: (data?.priority as AppNotification['priority']) || 'medium',
      isRead: false,
      data: data as Record<string, unknown>,
      orderId: data?.orderId as string | undefined,
      truckId: data?.truckId as string | undefined,
      deepLink: data?.deepLink as string | undefined,
      createdAt: sentTime
        ? new Date(sentTime).toISOString()
        : new Date().toISOString(),
    };
  }

  private handleNotificationNavigation(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
  ): void {
    const { data } = remoteMessage;

    // If deepLink is provided, use it directly
    if (data?.deepLink) {
      console.log('[Notifications] Deep link provided:', data.deepLink);
    }

    // If we have notification data, navigate based on event_code
    if (data) {
      navigateFromNotification(data as Record<string, string>);
    } else {
      // Default to notifications tab
      navigateToTab('Notifications');
    }
  }

  cleanup(): void {
    this.unsubscribeOnMessage?.();
    this.unsubscribeOnTokenRefresh?.();
    this.unsubscribeOnNotificationOpened?.();
    this.unsubscribeOnMessage = null;
    this.unsubscribeOnTokenRefresh = null;
    this.unsubscribeOnNotificationOpened = null;
  }

  async testLocalNotification(): Promise<void> {
    await this.createNotificationChannel();
    await this.displayNotification(
      'Test Notification',
      'If you see this, local notifications are working!',
      { type: 'test' },
    );
  }
}

export const notificationService = new NotificationService();
