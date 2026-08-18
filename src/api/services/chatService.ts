import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { ChatRoom, Message, SendMessagePayload } from '../../types/chat';
import { useAuthStore } from '../../store/authStore';
import { Platform } from 'react-native';
import { getSenderRole } from '../../utils/permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../utils/storage';

export interface ImageAttachment {
  uri: string;
  type: string;
  name: string;
  width?: number;
  height?: number;
}

export interface AudioAttachment {
  uri: string;
  type: string;
  name: string;
  duration: number;
}

export interface UploadedAttachment {
  url: string;
  type: string;
  name: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
}

const detectMessageType = (attachments: unknown[]): 'text' | 'image' | 'audio' => {
  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
    return 'text';
  }
  const first = attachments[0] as any;
  if (!first) return 'text';
  const type = (first.type || '') as string;
  const url = (first.url || first.file_url || first.path || '') as string;
  if (type.includes('audio') || /\.(m4a|mp4|mp3|wav|aac|ogg)($|\?)/i.test(url) || first.duration != null) {
    return 'audio';
  }
  if (type.includes('image') || /\.(jpg|jpeg|png|gif|webp|bmp)($|\?)/i.test(url)) {
    return 'image';
  }
  return 'text';
};

function mapRawToMessage(msg: any): Message {
  return {
    id: String(msg.id),
    room_id: String(msg.order_id),
    chat_id: msg.chat_id,
    order_id: msg.order_id,
    sender_id: msg.sender_id,
    sender_name: msg.sender_name || 'User',
    sender_role: msg.sender_role || 'contractor',
    content: msg.message_text || msg.content || '',
    message_type: detectMessageType(msg.attachments || []),
    attachments: msg.attachments || [],
    created_at: msg.created_at,
    is_deleted: msg.is_deleted,
    timeline_visible: msg.timeline_visible,
  };
}

export const chatService = {
  getRooms: async (): Promise<ChatRoom[]> => {
    try {
      const res = await apiClient.get<{ success: boolean; data: any[] }>(
        API_ENDPOINTS.CHAT.ROOMS,
      );
      if (!res.success || !res.data) return [];
      return res.data.map((chat: any) => ({
        id: String(chat.id),
        name: chat.name || `Order #${chat.order_id}`,
        type: 'order' as const,
        order_id: chat.order_id,
        created_at: chat.created_at,
        is_active: chat.is_active,
        last_message_at: chat.last_message_at || undefined,
        last_message_preview: chat.last_message_preview || undefined,
      }));
    } catch (err) {
      console.error('[chatService] getRooms error:', err);
      return [];
    }
  },

  getOrCreateRoom: async (orderId: string | number): Promise<ChatRoom> => {
    const res = await apiClient.get<{ success: boolean; data: any }>(
      `${API_ENDPOINTS.CHAT.ROOMS}/${orderId}`,
    );
    if (!res.success || !res.data) {
      throw new Error('Failed to get or create chat room');
    }
    const chat = res.data;
    return {
      id: String(chat.id),
      name: chat.name || `Order #${orderId}`,
      type: 'order',
      order_id: chat.order_id || orderId,
      created_at: chat.created_at,
      is_active: chat.is_active !== false,
      last_message_at: chat.last_message_at || undefined,
    };
  },

  getMessages: async (
    orderId: string | number,
    limit = 50,
    before?: string,
  ): Promise<Message[]> => {
    const params: Record<string, any> = { limit };
    if (before) params.before = before;

    const res = await apiClient.get<{ success: boolean; data: any[] }>(
      `${API_ENDPOINTS.CHAT.MESSAGES}/${orderId}`,
      { params },
    );

    if (!res.success || !res.data) return [];
    return res.data.map(mapRawToMessage);
  },

  sendMessage: async (payload: SendMessagePayload): Promise<Message> => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Not authenticated');

    let userName = 'Unknown';
    if (user.fullName) {
      userName = user.fullName;
    } else if (user.firstName || user.lastName) {
      userName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    } else if (user.email) {
      userName = user.email.split('@')[0];
    }

    const userRole = getSenderRole(user);

    const messageData = {
      order_id: payload.order_id,
      chat_id: payload.chat_id,
      content: payload.content || '',
      sender_name: userName,
      sender_role: userRole,
      attachments: payload.attachments || [],
      message_type: payload.message_type || 'text',
      timeline_visible: payload.timeline_visible !== false,
    };

    const res = await apiClient.post<{ success: boolean; data: any }>(
      API_ENDPOINTS.CHAT.SEND_MESSAGE,
      messageData,
    );

    if (!res.success || !res.data) {
      throw new Error('Failed to send message');
    }

    return mapRawToMessage(res.data);
  },

  uploadImage: async (image: ImageAttachment, orderId: string | number): Promise<UploadedAttachment> => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Not authenticated');

    const backendUrl = await AsyncStorage.getItem(STORAGE_KEYS.BACKEND_URL);
    if (!backendUrl) throw new Error('Backend URL not configured');

    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    const timestamp = Date.now();
    const fileExt = image.name.split('.').pop() || 'jpg';
    const fileName = `${orderId}/${user.id}/${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const uploadUrl = `${backendUrl}/chat/upload`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.timeout = 60000;

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              url: response.data?.url || response.url || '',
              type: image.type,
              name: image.name,
              width: image.width,
              height: image.height,
            });
          } catch {
            reject(new Error('Invalid upload response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status} - ${xhr.responseText || 'Server error'}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network request failed'));
      xhr.ontimeout = () => reject(new Error('Upload timeout'));

      xhr.open('POST', uploadUrl);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      const formData = new FormData();
      let fileUri = image.uri;
      if (Platform.OS === 'ios' && !fileUri.startsWith('file://')) {
        fileUri = `file://${fileUri}`;
      }
      formData.append('file', {
        uri: fileUri,
        type: image.type || 'image/jpeg',
        name: fileName.split('/').pop() || `image_${timestamp}.jpg`,
      } as any);
      formData.append('order_id', String(orderId));

      xhr.send(formData);
    });
  },

  uploadImages: async (images: ImageAttachment[], orderId: string | number): Promise<UploadedAttachment[]> => {
    return Promise.all(images.map(image => chatService.uploadImage(image, orderId)));
  },

  uploadAudio: async (audio: AudioAttachment, orderId: string | number): Promise<UploadedAttachment> => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Not authenticated');

    const backendUrl = await AsyncStorage.getItem(STORAGE_KEYS.BACKEND_URL);
    if (!backendUrl) throw new Error('Backend URL not configured');

    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    const timestamp = Date.now();
    const fileExt = audio.name.split('.').pop() || 'm4a';
    const fileName = `${orderId}/${user.id}/${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const uploadUrl = `${backendUrl}/chat/upload`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.timeout = 60000;

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              url: response.data?.url || response.url || '',
              type: audio.type,
              name: audio.name,
              duration: audio.duration,
            });
          } catch {
            reject(new Error('Invalid upload response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network request failed'));
      xhr.ontimeout = () => reject(new Error('Upload timeout'));

      xhr.open('POST', uploadUrl);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      const formData = new FormData();
      let fileUri = audio.uri;
      if (Platform.OS === 'ios' && !fileUri.startsWith('file://')) {
        fileUri = `file://${fileUri}`;
      }
      formData.append('file', {
        uri: fileUri,
        type: audio.type || 'audio/m4a',
        name: fileName.split('/').pop() || `voice_${timestamp}.m4a`,
      } as any);
      formData.append('order_id', String(orderId));

      xhr.send(formData);
    });
  },

  sendVoiceMessage: async (
    payload: SendMessagePayload,
    audio: AudioAttachment,
  ): Promise<Message> => {
    const uploadedAudio = await chatService.uploadAudio(audio, payload.order_id);
    return chatService.sendMessage({
      ...payload,
      message_type: 'audio',
      attachments: [uploadedAudio],
    });
  },

  sendMessageWithImages: async (
    payload: SendMessagePayload,
    images: ImageAttachment[],
  ): Promise<Message> => {
    const uploadedAttachments = await chatService.uploadImages(images, payload.order_id);
    return chatService.sendMessage({
      ...payload,
      message_type: images.length > 0 && !payload.content ? 'image' : 'text',
      attachments: uploadedAttachments,
    });
  },

  markAsRead: async (orderId: string | number): Promise<boolean> => {
    try {
      const res = await apiClient.post<{ success: boolean }>(
        API_ENDPOINTS.CHAT.MARK_READ,
        { order_id: orderId },
      );
      return res.success;
    } catch (error) {
      console.error('[chatService] markAsRead error:', error);
      return false;
    }
  },

  getUnreadCount: async (orderId: string | number): Promise<number> => {
    try {
      const res = await apiClient.get<{ success: boolean; data: { counts: Record<string, number> } }>(
        API_ENDPOINTS.CHAT.UNREAD_COUNTS,
        { params: { order_ids: String(orderId) } },
      );
      if (res.success && res.data?.counts) {
        return res.data.counts[String(orderId)] || 0;
      }
      return 0;
    } catch (error) {
      console.error('[chatService] getUnreadCount error:', error);
      return 0;
    }
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.CHAT.MESSAGES}/${messageId}`);
  },

  getUnreadCounts: async (orderIds?: string[]): Promise<{ counts: Record<string, number>; total_unread: number }> => {
    try {
      const params: Record<string, string> = {};
      if (orderIds && orderIds.length > 0) {
        params.order_ids = orderIds.join(',');
      }
      const res = await apiClient.get<{ success: boolean; data: { counts: Record<string, number>; total_unread: number } }>(
        API_ENDPOINTS.CHAT.UNREAD_COUNTS,
        { params },
      );
      return res.success ? res.data : { counts: {}, total_unread: 0 };
    } catch (error) {
      console.error('[chatService] getUnreadCounts error:', error);
      return { counts: {}, total_unread: 0 };
    }
  },
};

export default chatService;
