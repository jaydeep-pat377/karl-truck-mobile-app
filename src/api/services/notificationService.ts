import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { AppNotification } from '../../types/notification';

export interface NotificationQueueParams {
  user_id: string;
  tenant_id: number;
  page?: number;
  limit?: number;
}

export interface NotificationQueueItem {
  id: number;
  queue_uuid: string;
  event_log_id: number;
  channel_code: string;
  channel_name: string | null;
  user_id: string;
  user_email: string | null;
  user_phone: string | null;
  user_name: string | null;
  recipient_device_token: string | null;
  customer_id: string | null;
  customer_code: string | null;
  customer_name: string | null;
  event_code: string;
  event_name: string;
  entity_type: string;
  entity_id: string | null;
  entity_code: string | null;
  subject: string;
  body: string;
  body_html: string | null;
  scheduled_at: string;
  priority: number;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  attempt_count: number;
  max_attempts: number;
  next_retry_at: string | null;
  last_attempt_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
  tenant_id: number;
}

export interface NotificationQueueResponse {
  success: boolean;
  message: string;
  data: {
    notifications: NotificationQueueItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Map event_code to notification type
const mapEventCodeToType = (eventCode: string): AppNotification['type'] => {
  const typeMap: Record<string, AppNotification['type']> = {
    'ORDER_CREATED': 'order_update',
    'ORDER_UPDATED': 'order_update',
    'ORDER_CANCELLED': 'order_update',
    'DELIVERY_STARTED': 'delivery_update',
    'DELIVERY_COMPLETED': 'delivery_update',
    'DISPATCH_ALERT': 'dispatch_alert',
    'ETA_UPDATE': 'eta_update',
    'WEATHER_ALERT': 'weather_alert',
  };
  return typeMap[eventCode] || 'system';
};

// Map priority number to priority level
const mapPriorityToLevel = (priority: number): AppNotification['priority'] => {
  if (priority >= 8) return 'high';
  if (priority >= 4) return 'medium';
  return 'low';
};

const mapNotificationFromApi = (item: NotificationQueueItem): AppNotification => ({
  id: String(item.id),
  type: mapEventCodeToType(item.event_code),
  title: item.subject,
  body: item.body,
  priority: mapPriorityToLevel(item.priority),
  isRead: item.status === 'read' || item.status === 'delivered',
  data: {
    queue_uuid: item.queue_uuid,
    event_code: item.event_code,
    event_name: item.event_name,
    entity_type: item.entity_type,
    entity_id: item.entity_id,
    customer_name: item.customer_name,
    status: item.status,
  },
  orderId: item.entity_type === 'order' && item.entity_id ? item.entity_id : undefined,
  createdAt: item.created_at,
});

export const notificationService = {
  getNotificationQueue: async (params: NotificationQueueParams): Promise<NotificationQueueResponse> => {
    const queryParams = new URLSearchParams({
      user_id: params.user_id,
      tenant_id: String(params.tenant_id),
      page: String(params.page || 1),
      limit: String(params.limit || 50),
    });

    return apiClient.get<NotificationQueueResponse>(
      `${API_ENDPOINTS.NOTIFICATIONS.QUEUE}?${queryParams.toString()}`
    );
  },

  getNotifications: async (userId: string, tenantId: number, page = 1, limit = 50): Promise<AppNotification[]> => {
    const response = await notificationService.getNotificationQueue({
      user_id: userId,
      tenant_id: tenantId,
      page,
      limit,
    });

    if (response.success && response.data?.notifications) {
      return response.data.notifications.map(mapNotificationFromApi);
    }

    return [];
  },
};

export default notificationService;
