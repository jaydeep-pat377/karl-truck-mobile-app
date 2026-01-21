/**
 * Notification Types
 */

export type NotificationType =
  | 'order_update'
  | 'delivery_update'
  | 'dispatch_alert'
  | 'eta_update'
  | 'weather_alert'
  | 'communication'
  | 'system';

export type NotificationPriority = 'low' | 'medium' | 'high';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  priority: NotificationPriority;
  isRead: boolean;
  data?: Record<string, unknown>;
  orderId?: string;
  truckId?: string;
  deepLink?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  orderUpdates: boolean;
  deliveryUpdates: boolean;
  dispatchAlerts: boolean;
  weatherAlerts: boolean;
  systemNotices: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}
