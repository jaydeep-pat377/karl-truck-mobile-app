import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform } from 'react-native';
import { useNotificationStore } from '../store/notificationStore';
import { AppNotification, NotificationType } from '../types/notification';
import { navigateFromNotification, navigateToTab } from './navigationService';
import { ensureCorrectTenant } from './deepLinkService';
import { alertService } from './alertService';
import { buildNotifKey, claimNotification } from '../utils/notificationDedup';

const CHANNEL_ID = 'truckast_heads_up';
const CHAT_CHANNEL_ID = 'chat';

class NotificationService {
  private unsubscribeOnMessage: (() => void) | null = null;
  private unsubscribeOnTokenRefresh: (() => void) | null = null;
  private unsubscribeOnNotificationOpened: (() => void) | null = null;
  private channelCreated = false;
  private chatChannelCreated = false;

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

  async createChatChannel(): Promise<void> {
    if (Platform.OS === 'android' && !this.chatChannelCreated) {
      try {
        await notifee.createChannel({
          id: CHAT_CHANNEL_ID,
          name: 'Chat messages',
          description: 'New messages in order chats',
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
        });
        this.chatChannelCreated = true;
      } catch (error) {
        console.error('[Notifications] Error creating chat channel:', error);
      }
    }
  }

  async displayChatNotification(
    title: string,
    body: string,
    data: Record<string, string>,
  ): Promise<void> {
    const key = buildNotifKey({
      title,
      body,
      chatId: data?.chat_id,
      messageId: data?.message_id,
      entityType: data?.entity_type,
      entityId: data?.entity_id,
    });
    if (!claimNotification(`display:${key}`)) {
      return;
    }

    try {
      await this.createChatChannel();
      await notifee.displayNotification({
        title,
        body,
        data,
        android: {
          channelId: CHAT_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: { id: 'default' },
          smallIcon: 'ic_notification',
          color: '#6BB130',
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
      console.error('[Notifications] Error displaying chat notification:', error);
    }
  }

  async displayNotification(
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const key = buildNotifKey({
      title,
      body,
      entityType: data?.entity_type,
      entityId: data?.entity_id,
    });
    if (!claimNotification(`display:${key}`)) {
      return;
    }
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
          smallIcon: 'ic_notification',
          color: '#6BB130',
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
    try {
      const token = _token || useNotificationStore.getState().fcmToken;
      if (!token) return false;
      const { default: apiClient } = await import('../api/apiClient');
      const { API_ENDPOINTS } = await import('../api/endpoints');
      await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.REGISTER_DEVICE, {
        device_token: token,
        device_type: Platform.OS,
      });
      return true;
    } catch (error: any) {
      // 404 = endpoint not deployed yet; token was already registered at
      // login via device_info in exchange-code, so this is non-fatal.
      const status = error?.response?.status;
      if (status === 404) {
        return true;
      }
      console.warn('[Notifications] syncTokenToServer failed:', error?.message);
      return false;
    }
  }

  setupListeners(): void {
    this.unsubscribeOnMessage = messaging().onMessage(
      async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        const data = remoteMessage.data || {};

        // Same content can arrive on this device via the Supabase
        // notification_queue realtime path (see useRealtimeSubscription /
        // useSupabaseNotifications). Whichever path observes the (title,
        // body, entity) tuple first owns the bell-list entry; the other
        // path drops the event. Display dedup happens separately inside
        // displayChatNotification / displayNotification.
        const fcmTitle =
          remoteMessage.notification?.title ||
          (data.title as string | undefined) ||
          (data.sender_name as string | undefined) ||
          '';
        const fcmBody =
          remoteMessage.notification?.body ||
          (data.body as string | undefined) ||
          (data.message_preview as string | undefined) ||
          '';
        const storeKey = buildNotifKey({
          title: fcmTitle,
          body: fcmBody,
          entityType: data?.entity_type as string | undefined,
          entityId: data?.entity_id as string | undefined,
          chatId: data?.chat_id as string | undefined,
          messageId: data?.message_id as string | undefined,
        });
        const ownsStoreAdd = claimNotification(`store:${storeKey}`);

        const notification = this.parseRemoteMessage(remoteMessage);
        if (notification && ownsStoreAdd) {
          useNotificationStore.getState().addNotification(notification);
        }

        const eventCodeStr =
          typeof data.event_code === 'string'
            ? data.event_code.toUpperCase()
            : '';
        const isChatMessage =
          data.type === 'chat_message' ||
          data.type === 'order_request_message' ||
          eventCodeStr.includes('CHAT') ||
          eventCodeStr.includes('MESSAGE');

        if (isChatMessage) {
          await this.displayChatNotification(
            fcmTitle || 'New message',
            fcmBody,
            data as Record<string, string>,
          );
        } else if (fcmTitle || fcmBody) {
          await this.displayNotification(
            fcmTitle,
            fcmBody,
            data as Record<string, string>,
          );
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
        void this.dispatchNotificationOpen(
          notification?.data as Record<string, string> | undefined,
        );
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
      await this.dispatchNotificationOpen(
        notification?.data as Record<string, string> | undefined,
      );
    }
  }

  parseRemoteMessage(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
  ): AppNotification | null {
    const { notification, data, messageId, sentTime } = remoteMessage;
    // Chat pushes are now data-only on Android (see backend sendChatPush),
    // so remoteMessage.notification is undefined and title/body ride in
    // data. Pick whichever source has a value.
    const title =
      notification?.title ||
      (data?.title as string | undefined) ||
      (data?.sender_name as string | undefined) ||
      '';
    const body =
      notification?.body ||
      (data?.body as string | undefined) ||
      (data?.message_preview as string | undefined) ||
      '';
    if (!title && !body) return null;

    return {
      id: messageId || Date.now().toString(),
      type: (data?.type as NotificationType) || 'system',
      title,
      body,
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
    void this.dispatchNotificationOpen(
      remoteMessage.data as Record<string, string> | undefined,
    );
  }

  /**
   * Single entry point for "user opened a notification".
   *
   * If the push carries a `tenant_slug` / `tenant_subdomain` (stamped by the
   * web sender at /api/notifications/send) and the user is currently in a
   * different tenant, switch to the sender's tenant before deep-linking.
   * The switch reuses ensureCorrectTenant() from deepLinkService — same
   * mechanism we already use for shared deep-link URLs, including the
   * "you no longer have access" failure path.
   */
  async dispatchNotificationOpen(
    data: Record<string, string> | undefined,
  ): Promise<void> {
    console.log('[NotifTap] dispatchNotificationOpen called. data =', JSON.stringify(data));

    if (!data) {
      console.log('[NotifTap] no data → Notifications tab');
      navigateToTab('Notifications');
      return;
    }

    const tenantSlug = data.tenant_slug || data.tenant_subdomain;
    console.log('[NotifTap] tenantSlug from payload =', tenantSlug);

    if (tenantSlug) {
      try {
        const result = await ensureCorrectTenant(
          tenantSlug,
          data.tenant_subdomain,
        );
        console.log('[NotifTap] ensureCorrectTenant result =', JSON.stringify(result));
        if (!result.matched) {
          console.warn('[NotifTap] tenant switch failed → Notifications tab. reason:', result.reason);
          alertService.showError(
            'Tenant unavailable',
            "You don't have access to the workspace this notification was sent from.",
          );
          navigateToTab('Notifications');
          return;
        }
      } catch (err) {
        console.error('[NotifTap] tenant switch threw → Notifications tab:', err);
        navigateToTab('Notifications');
        return;
      }
    }

    console.log('[NotifTap] calling navigateFromNotification');
    navigateFromNotification(data);
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
