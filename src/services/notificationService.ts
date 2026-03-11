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
      await this.createNotificationChannel();
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
    } catch (error) {
      console.error('[Notifications] Error displaying notification:', error);
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      const notifeeSettings = await notifee.requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        await this.createNotificationChannel();
      }

      return enabled;
    } catch (error) {
      return false;
    }
  }

  private async waitForApnsToken(maxRetries = 5, delayMs = 1500): Promise<string | null> {
    for (let i = 0; i < maxRetries; i++) {
      const apnsToken = await messaging().getAPNSToken();
      if (apnsToken) {
        return apnsToken;
      }
      await new Promise<void>(resolve => setTimeout(() => resolve(), delayMs));
    }
    return null;
  }

  async getToken(): Promise<string | null> {
    try {

      const cachedToken = useNotificationStore.getState().fcmToken;
      if (cachedToken) {
        return cachedToken;
      }

      if (Platform.OS === 'ios') {
        try {
          await messaging().registerDeviceForRemoteMessages();
          const apnsToken = await this.waitForApnsToken();

          if (!apnsToken) {
            return null;
          }
        } catch (error) {
          return null;
        }
      }

      const token = await messaging().getToken();
      useNotificationStore.getState().setFcmToken(token);
      return token;
    } catch (error) {
      return null;
    }
  }

  async syncTokenToServer(_token?: string): Promise<boolean> {


    return false;
  }

  setupListeners(): void {
    this.unsubscribeOnMessage = messaging().onMessage(
      async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        const notification = this.parseRemoteMessage(remoteMessage);

        if (notification) {
          useNotificationStore.getState().addNotification(notification);

          await this.displayNotification(
            notification.title,
            notification.body,
            remoteMessage.data as Record<string, string>,
          );
        } else {
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


    this.unsubscribeOnTokenRefresh = messaging().onTokenRefresh(
      async (token: string) => {
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


    notifee.onForegroundEvent(({ type, detail }) => {
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

    const remoteMessage = await messaging().getInitialNotification();
    if (remoteMessage) {
      const notification = this.parseRemoteMessage(remoteMessage);
      if (notification) {
        useNotificationStore.getState().addNotification(notification);
      }
      this.handleNotificationNavigation(remoteMessage);
      return;
    }


    const initialNotification = await notifee.getInitialNotification();
    if (initialNotification) {
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

    if (data?.deepLink) {
      console.log('[Notifications] Deep link provided:', data.deepLink);
    }

    if (data) {
      navigateFromNotification(data as Record<string, string>);
    } else {

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
