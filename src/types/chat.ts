

export interface OrderChat {
  id: number;
  order_id: number;
  created_at: string;
  updated_at?: string;
  last_message_at?: string;
  is_active: boolean;
}

export interface ChatMessage {
  id: number;
  chat_id: number;
  order_id: number;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  message_text: string;
  attachments: unknown[];
  created_at: string;
  updated_at?: string;
  is_deleted: boolean;
  timeline_visible: boolean;
}

export interface ChatReadStatus {
  user_id: string;
  order_id: number;
  last_read_at: string;
  created_at: string;
  updated_at?: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  type: 'order';
  order_id: number;
  created_at: string;
  updated_at?: string;
  is_active: boolean;
  avatar_url?: string;
  last_message_at?: string;
  last_message_preview?: string;
  unread_count?: number;
  order_date?: string;
  customer_name?: string;
  project_name?: string;
  delivery_address?: string;
}

export interface Message {
  id: string;
  room_id: string;
  chat_id: number;
  order_id: number;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  message_type: 'text' | 'image' | 'audio' | 'system';
  attachments: unknown[];
  created_at: string;
  updated_at?: string;
  is_deleted: boolean;
  timeline_visible: boolean;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  user_email: string;
  user_name?: string;
  role: 'admin' | 'member';
  joined_at: string;
  last_read_at: string;
}

export interface TypingUser {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  started_at: string;
}

export interface CreateRoomPayload {
  order_id: number;
}

export interface SendMessagePayload {
  chat_id: number;
  order_id: number;
  content: string;
  message_type?: 'text' | 'image' | 'audio' | 'system';
  attachments?: unknown[];
  timeline_visible?: boolean;
}

export interface ChatRoomsResponse {
  success: boolean;
  data: ChatRoom[];
  message?: string;
}

export interface MessagesResponse {
  success: boolean;
  data: Message[];
  message?: string;
}
