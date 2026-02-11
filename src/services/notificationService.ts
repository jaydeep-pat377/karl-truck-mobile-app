import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { authService } from '../api/services/authService';
import { AppNotification, NotificationType } from '../types/notification';

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

  async getToken(): Promise<string | null> {
    try {
      console.log('[Notifications] Getting token for platform:', Platform.OS);

      if (Platform.OS === 'ios') {
        try {

          console.log('[Notifications] Registering for remote messages...');
          await messaging().registerDeviceForRemoteMessages();
          console.log('[Notifications] Registered for remote messages');


          const apnsToken = await messaging().getAPNSToken();
          console.log('[Notifications] APNS Token:', apnsToken);

          if (!apnsToken) {

            console.log('[Notifications] No APNS token - running on simulator or permissions denied');
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
          const { data } = remoteMessage;
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
    if (data?.deepLink) {
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
