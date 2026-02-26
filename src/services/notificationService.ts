import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { authService } from '../api/services/authService';
import { AppNotification, NotificationType } from '../types/notification';
import { navigateFromNotification, navigateToTab } from './navigationService';
import { syncDeviceTokenToSupabase } from '../lib/notification-client';

const CHANNEL_ID = 'truckast_default';

class NotificationService {
  private unsubscribeOnMessage: (() => void) | null = null;
  private unsubscribeOnTokenRefresh: (() => void) | null = null;
  private unsubscribeOnNotificationOpened: (() => void) | null = null;

  async createNotificationChannel(): Promise<void> {
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: CHANNEL_ID,
        name: 'TruckAst Notifications',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });
    }
  }

  async displayNotification(
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    try {

      await this.createNotificationChannel();

      const notificationId = await notifee.displayNotification({
        title,
        body,
        data,
        android: {
          channelId: CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          smallIcon: 'ic_launcher',
          largeIcon: 'ic_launcher',
          pressAction: { id: 'default' },
          sound: 'default',
          showTimestamp: true,
        },
        ios: {
          sound: 'default',
        },
      });
    } catch (error) {
      console.error('[Notifications] Error displaying notification:', error);
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      console.log('[Notifications] Requesting permission...');
      const authStatus = await messaging().requestPermission();
      console.log('[Notifications] Auth status:', authStatus);

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


  async syncTokenToServer(token?: string): Promise<boolean> {
    try {
      const isAuthenticated = useAuthStore.getState().isAuthenticated;

      if (!isAuthenticated) {
        return false;
      }

      const fcmToken = token || await this.getToken();

      if (!fcmToken) {
        return false;
      }

      const platform = Platform.OS as 'ios' | 'android';

      const response = await authService.updateDeviceToken({
        device_token: fcmToken,
        platform,
      });

      if (response.success) {
        console.log('[Notifications] Device token synced successfully');
        return true;
      }
      return false;
    } catch (error: any) {

      if (error?.response?.status === 404) {

        return false;
      }

      console.error('[Notifications] Error syncing device token:', error?.message || error);
      return false;
    }
  }

  setupListeners(): void {
    console.log('[Notifications] Setting up listeners...');

    this.unsubscribeOnMessage = messaging().onMessage(
      async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        console.log('[Notifications] Received foreground message:', JSON.stringify(remoteMessage, null, 2));

        // Skip FCM messages from Supabase Edge Function in foreground
        // because Supabase Realtime already handles display in foreground
        if (remoteMessage.data?.source === 'supabase_edge_function') {
          console.log('[Notifications] Skipping Edge Function FCM in foreground (Realtime handles it)');
          return;
        }

        const notification = this.parseRemoteMessage(remoteMessage);

        if (notification) {
          console.log('[Notifications] Parsed notification:', notification);
          useNotificationStore.getState().addNotification(notification);

          await this.displayNotification(
            notification.title,
            notification.body,
            remoteMessage.data as Record<string, string>,
          );
        } else {
          console.log('[Notifications] Using data-only message');
          const { data } : any = remoteMessage;
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


    this.unsubscribeOnTokenRefresh = messaging().onTokenRefresh(
      async (token: string) => {
        console.log('[Notifications] Token refreshed, syncing...');
        useNotificationStore.getState().setFcmToken(token);

        await this.syncTokenToServer(token);

        // Also sync refreshed token to Supabase for Edge Function push delivery
        const userId = useAuthStore.getState().user?.id;
        if (userId) {
          const platform = Platform.OS as 'ios' | 'android';
          syncDeviceTokenToSupabase(userId, token, platform).then((synced) => {
            console.log('[Notifications] Supabase token refresh sync:', synced ? 'success' : 'failed');
          });
        }
      },
    );


    this.unsubscribeOnNotificationOpened = messaging().onNotificationOpenedApp(
      (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        const notification = this.parseRemoteMessage(remoteMessage);
        if (notification) {
          useNotificationStore.getState().addNotification(notification);
        }
        this.handleNotificationNavigation(remoteMessage);
      },
    );
  }

  async checkInitialNotification(): Promise<void> {
    const remoteMessage = await messaging().getInitialNotification();
    if (remoteMessage) {
      const notification = this.parseRemoteMessage(remoteMessage);
      if (notification) {
        useNotificationStore.getState().addNotification(notification);
      }
      this.handleNotificationNavigation(remoteMessage);
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
      // Could add Linking.openURL support here for custom schemes
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
