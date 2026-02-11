import { supabase, supabaseAdmin, isSupabaseConfigured, ensureAuthenticated } from '../../services/supabase/supabaseClient';
import { ChatRoom, Message, SendMessagePayload } from '../../types/chat';
import { useAuthStore } from '../../store/authStore';
import { Platform } from 'react-native';

export interface ImageAttachment {
  uri: string;
  type: string;
  name: string;
  width?: number;
  height?: number;
}

export interface UploadedAttachment {
  url: string;
  type: string;
  name: string;
  size?: number;
  width?: number;
  height?: number;
}

const STORAGE_BUCKET = 'order-chat-images';

const checkSupabase = async () => {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }


  await ensureAuthenticated();


  return supabaseAdmin;
};

interface RawChatMessage {
  id: number;
  chat_id: number;
  order_id: number;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  message_text: string | null;
  attachments: unknown[];
  created_at: string;
  updated_at: string | null;
  is_deleted: boolean;
  timeline_visible: boolean;
}

interface OrderChat {
  id: number;
  order_id: number;
  created_at: string;
  updated_at: string | null;
  last_message_at: string | null;
  is_active: boolean;
}

export const chatService = {

  getRooms: async (): Promise<ChatRoom[]> => {
    if (!isSupabaseConfigured() || !supabaseAdmin) {
      return [];
    }

    try {
      await ensureAuthenticated();

      const { data, error } = await supabaseAdmin
        .from('order_chats')
        .select('*')
        .eq('is_active', true)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.log('Get rooms error:', error.message);
        return [];
      }

      return (data as OrderChat[] || []).map((chat) => ({
        id: String(chat.id),
        name: `Order #${chat.order_id}`,
        type: 'order' as const,
        order_id: chat.order_id,
        created_at: chat.created_at,
        is_active: chat.is_active,
        last_message_at: chat.last_message_at || undefined,
      }));
    } catch (err) {
      console.log('Get rooms exception:', err);
      return [];
    }
  },


  getOrCreateRoom: async (orderId: number): Promise<ChatRoom> => {
    const sb = await checkSupabase();



    const { data: chatId, error: rpcError } = await sb.rpc('ensure_chat_exists', {
      p_order_id: orderId,
    });

    if (!rpcError && chatId) {

      return {
        id: String(chatId),
        name: `Order #${orderId}`,
        type: 'order',
        order_id: orderId,
        created_at: new Date().toISOString(),
        is_active: true,
      };
    }

    console.log('RPC ensure_chat_exists failed or not available:', rpcError?.message);


    const { data: existingChat, error: findError } = await sb
      .from('order_chats')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (existingChat && !findError) {
      const chat = existingChat as OrderChat;
      return {
        id: String(chat.id),
        name: `Order #${chat.order_id}`,
        type: 'order',
        order_id: chat.order_id,
        created_at: chat.created_at,
        is_active: chat.is_active,
        last_message_at: chat.last_message_at || undefined,
      };
    }


    const { data: newChat, error: createError } = await sb
      .from('order_chats')
      .insert({
        order_id: orderId,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('Create chat room error:', createError);
      throw new Error(`Failed to create chat room: ${createError.message}`);
    }

    const chat = newChat as OrderChat;
    return {
      id: String(chat.id),
      name: `Order #${chat.order_id}`,
      type: 'order',
      order_id: chat.order_id,
      created_at: chat.created_at,
      is_active: chat.is_active,
    };
  },


  getMessages: async (
    orderId: number,
    limit = 50,
    before?: string
  ): Promise<Message[]> => {
    const sb = await checkSupabase();

    let query = sb
      .from('chat_messages')
      .select('*')
      .eq('order_id', orderId)
      .or('is_deleted.eq.false,is_deleted.is.null')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get messages error:', error);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);

      if (error.code === '42P01') {
        throw new Error('chat_messages table does not exist.');
      } else if (error.code === '42501') {
        throw new Error('Permission denied. Check RLS policies on chat_messages table.');
      }
      throw error;
    }


    return ((data as RawChatMessage[]) || [])
      .reverse()
      .map((msg) => ({
        id: String(msg.id),
        room_id: String(msg.order_id),
        chat_id: msg.chat_id,
        order_id: msg.order_id,
        sender_id: msg.sender_id,
        sender_name: msg.sender_name || 'User',
        sender_role: msg.sender_role || 'contractor',
        content: msg.message_text || '',
        message_type: 'text' as const,
        attachments: msg.attachments || [],
        created_at: msg.created_at,
        is_deleted: msg.is_deleted,
        timeline_visible: msg.timeline_visible,
      }));
  },


  uploadImage: async (image: ImageAttachment, orderId: number): Promise<UploadedAttachment> => {
    await checkSupabase();
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Not authenticated');


    const timestamp = Date.now();
    const fileExt = image.name.split('.').pop() || 'jpg';
    const fileName = `${orderId}/${user.id}/${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const supabaseUrl = 'https://lwplbyltqsfmfvsgmrjq.supabase.co';
    const supabaseServiceKey = 'SUPABASE_SERVICE_KEY_REMOVED';
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${fileName}`;

    console.log('[Chat] Uploading image:', fileName);
    console.log('[Chat] Image URI:', image.uri);
    console.log('[Chat] Upload URL:', uploadUrl);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();


      xhr.timeout = 60000;

      xhr.onload = () => {
        console.log('[Chat] XHR onload - status:', xhr.status);
        console.log('[Chat] XHR response:', xhr.responseText);

        if (xhr.status >= 200 && xhr.status < 300) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${fileName}`;
          console.log('[Chat] Upload successful:', publicUrl);
          resolve({
            url: publicUrl,
            type: image.type,
            name: image.name,
            width: image.width,
            height: image.height,
          });
        } else {
          console.error('[Chat] Upload failed with status:', xhr.status);
          reject(new Error(`Upload failed: ${xhr.status} - ${xhr.responseText || 'Server error'}`));
        }
      };

      xhr.onerror = () => {
        console.error('[Chat] XHR onerror triggered');
        reject(new Error('Network request failed - please check your internet connection'));
      };

      xhr.ontimeout = () => {
        console.error('[Chat] XHR timeout');
        reject(new Error('Upload timeout - please try again'));
      };

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          console.log('[Chat] Upload progress:', progress + '%');
        }
      };

      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('Authorization', `Bearer ${supabaseServiceKey}`);
      xhr.setRequestHeader('x-upsert', 'true');


      const formData = new FormData();


      let fileUri = image.uri;



      if (Platform.OS === 'ios' && !fileUri.startsWith('file://')) {
        fileUri = `file://${fileUri}`;
      }


      const fileData: any = {
        uri: fileUri,
        type: image.type || 'image/jpeg',
        name: fileName.split('/').pop() || `image_${timestamp}.jpg`,
      };

      console.log('[Chat] File URI:', fileUri);
      console.log('[Chat] File data:', JSON.stringify(fileData));
      formData.append('file', fileData);

      xhr.send(formData);
    });
  },


  uploadImages: async (images: ImageAttachment[], orderId: number): Promise<UploadedAttachment[]> => {
    const uploadPromises = images.map(image => chatService.uploadImage(image, orderId));
    return Promise.all(uploadPromises);
  },


  sendMessage: async (payload: SendMessagePayload): Promise<Message> => {
    const sb = await checkSupabase();
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Not authenticated');


    const senderId = user.id;
    if (!senderId) throw new Error('Could not get user ID');


    let userName = 'Unknown';
    if (user.fullName) {
      userName = user.fullName;
    } else if (user.firstName || user.lastName) {
      userName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    } else if (user.email) {

      userName = user.email.split('@')[0];
    }

    console.log('Sending message with user name:', userName);


    let userRole = 'contractor';
    const role = (user.role || '').toLowerCase();
    if (role === 'admin' || role === 'administrator') {
      userRole = 'admin';
    } else if (role === 'producer' || role === 'concrete_producer' || role === 'plant') {
      userRole = 'concrete_producer';
    }


    let chatId = payload.chat_id;
    if (!chatId || chatId === payload.order_id) {
      const room = await chatService.getOrCreateRoom(payload.order_id);
      chatId = parseInt(room.id, 10);
    }

    const messageData = {
      chat_id: chatId,
      order_id: payload.order_id,
      sender_id: senderId,
      sender_name: userName,
      sender_role: userRole,
      message_text: payload.content || '',
      attachments: payload.attachments || [],
      is_deleted: false,
      timeline_visible: payload.timeline_visible !== false,
    };

    const { data, error } = await sb
      .from('chat_messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('Send message error:', error);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);

      if (error.code === '42P01') {
        throw new Error('chat_messages table does not exist.');
      } else if (error.code === '42501') {
        throw new Error('Permission denied. Check RLS policies on chat_messages table.');
      } else if (error.code === '23503') {
        throw new Error('Foreign key violation. Chat room may not exist.');
      } else if (error.code === '23514') {
        throw new Error('Message must have content or attachments.');
      } else if (error.message?.includes('JWT')) {
        throw new Error('Authentication error. Please try logging out and back in.');
      }
      throw error;
    }

    const msg = data as RawChatMessage;
    return {
      id: String(msg.id),
      room_id: String(msg.order_id),
      chat_id: msg.chat_id,
      order_id: msg.order_id,
      sender_id: msg.sender_id,
      sender_name: msg.sender_name,
      sender_role: msg.sender_role,
      content: msg.message_text || '',
      message_type: 'text',
      attachments: msg.attachments || [],
      created_at: msg.created_at,
      is_deleted: msg.is_deleted,
      timeline_visible: msg.timeline_visible,
    };
  },


  testConnection: async (): Promise<boolean> => {
    try {
      const response = await fetch('https://lwplbyltqsfmfvsgmrjq.supabase.co/storage/v1/bucket', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer SUPABASE_SERVICE_KEY_REMOVED',
        },
      });
      console.log('[Chat] Connection test status:', response.status);
      return response.ok;
    } catch (error) {
      console.error('[Chat] Connection test failed:', error);
      return false;
    }
  },


  sendMessageWithImages: async (
    payload: SendMessagePayload,
    images: ImageAttachment[]
  ): Promise<Message> => {
    console.log('[Chat] sendMessageWithImages called:', { payload, imagesCount: images.length });

    try {

      const isConnected = await chatService.testConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to storage server. Please check your internet connection.');
      }


      console.log('[Chat] Starting image uploads...');
      const uploadedAttachments = await chatService.uploadImages(images, payload.order_id);
      console.log('[Chat] Images uploaded:', uploadedAttachments);


      console.log('[Chat] Sending message with attachments...');
      const result = await chatService.sendMessage({
        ...payload,
        message_type: images.length > 0 && !payload.content ? 'image' : 'text',
        attachments: uploadedAttachments,
      });
      console.log('[Chat] Message sent successfully:', result);
      return result;
    } catch (error) {
      console.error('[Chat] sendMessageWithImages error:', error);
      throw error;
    }
  },


  markAsRead: async (orderId: number): Promise<void> => {
    const sb = await checkSupabase();
    const user = useAuthStore.getState().user;

    if (!user?.id) {
      console.warn('No user ID, cannot mark as read');
      return;
    }

    const userId = user.id;


    const readAt = new Date(Date.now() + 2000).toISOString();

    const { error } = await sb
      .from('chat_read_status')
      .upsert({
        user_id: userId,
        order_id: orderId,
        last_read_at: readAt,
      }, {
        onConflict: 'user_id,order_id',
      });

    if (error) {
      console.error('Mark as read error:', error);

    }
  },


  getUnreadCount: async (orderId: number): Promise<number> => {
    const sb = await checkSupabase();
    const user = useAuthStore.getState().user;

    if (!user?.id) {
      return 0;
    }

    const userId = user.id;


    const { data: readStatus } = await sb
      .from('chat_read_status')
      .select('last_read_at')
      .eq('user_id', userId)
      .eq('order_id', orderId)
      .single();

    const lastReadAt = readStatus?.last_read_at;


    let query = sb
      .from('chat_messages')
      .select('id', { count: 'exact' })
      .eq('order_id', orderId)
      .eq('is_deleted', false)
      .neq('sender_id', userId);

    if (lastReadAt) {
      query = query.gt('created_at', lastReadAt);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Get unread count error:', error);
      return 0;
    }

    return count || 0;
  },


  deleteMessage: async (messageId: string): Promise<void> => {
    const sb = await checkSupabase();
    const { error } = await sb
      .from('chat_messages')
      .update({ is_deleted: true })
      .eq('id', parseInt(messageId, 10));

    if (error) {
      console.error('Delete message error:', error);
      throw error;
    }
  },


  subscribeToMessages: (
    orderId: number,
    onMessage: (message: Message) => void
  ) => {
    if (!isSupabaseConfigured() || !supabase) return null;


    const channel = supabase
      .channel(`order-chat:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const msg = payload.new as RawChatMessage;
          onMessage({
            id: String(msg.id),
            room_id: String(msg.order_id),
            chat_id: msg.chat_id,
            order_id: msg.order_id,
            sender_id: msg.sender_id,
            sender_name: msg.sender_name || 'User',
            sender_role: msg.sender_role || 'contractor',
            content: msg.message_text || '',
            message_type: 'text',
            attachments: msg.attachments || [],
            created_at: msg.created_at,
            is_deleted: msg.is_deleted,
            timeline_visible: msg.timeline_visible,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const msg = payload.new as RawChatMessage;
          onMessage({
            id: String(msg.id),
            room_id: String(msg.order_id),
            chat_id: msg.chat_id,
            order_id: msg.order_id,
            sender_id: msg.sender_id,
            sender_name: msg.sender_name || 'User',
            sender_role: msg.sender_role || 'contractor',
            content: msg.message_text || '',
            message_type: 'text',
            attachments: msg.attachments || [],
            created_at: msg.created_at,
            is_deleted: msg.is_deleted,
            timeline_visible: msg.timeline_visible,
          });
        }
      )
      .subscribe((status, err) => {
        console.log(`Chat subscription status for order ${orderId}:`, status);
        if (err) {
          console.error(`Chat subscription error:`, err);
        }
      });

    return channel;
  },


  unsubscribeFromMessages: async (
    channel: ReturnType<typeof supabase.channel>
  ) => {
    if (channel && supabase) {
      await supabase.removeChannel(channel);
    }
  },
};

export default chatService;
