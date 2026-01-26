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
      // Ensure channel exists before displaying (Android)
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
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      await this.createNotificationChannel();
    }

    return enabled;
  }

  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'ios') {
        const apnsToken = await messaging().getAPNSToken();
        if (!apnsToken) {
          return null;
        }
      }

      const token = await messaging().getToken();
      useNotificationStore.getState().setFcmToken(token);
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Syncs the device token to the server.
   * Should be called when:
   * 1. User logs in (already handled in LoginScreen)
   * 2. Token refreshes while user is logged in
   * 3. App launches with an already logged-in user
   */
  async syncTokenToServer(token?: string): Promise<boolean> {
    try {
      const isAuthenticated = useAuthStore.getState().isAuthenticated;

      if (!isAuthenticated) {
        console.log('[Notifications] User not authenticated, skipping token sync');
        return false;
      }

      const fcmToken = token || await this.getToken();

      if (!fcmToken) {
        console.log('[Notifications] No FCM token available');
        return false;
      }

      const platform = Platform.OS as 'ios' | 'android';

      console.log('[Notifications] Syncing device token to server...');
      const response = await authService.updateDeviceToken({
        device_token: fcmToken,
        platform,
      });

      if (response.success) {
        console.log('[Notifications] Device token synced successfully');
        return true;
      } else {
        console.log('[Notifications] Failed to sync device token:', response.message);
        return false;
      }
    } catch (error) {
      console.error('[Notifications] Error syncing device token:', error);
      return false;
    }
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

    // Token refresh - sync to local store and server
    this.unsubscribeOnTokenRefresh = messaging().onTokenRefresh(
      async (token: string) => {
        console.log('[Notifications] Token refreshed, syncing...');
        useNotificationStore.getState().setFcmToken(token);

        // Sync the new token to the server if user is logged in
        await this.syncTokenToServer(token);
      },
    );

    // Notification opened (app in background)
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

  // Test function to verify local notifications work
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
