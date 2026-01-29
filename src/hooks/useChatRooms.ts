import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { chatService } from '../api/services/chatService';
import { useChatStore } from '../store/chatStore';
import { supabase, isSupabaseConfigured } from '../services/supabase/supabaseClient';
import { ChatRoom, Message } from '../types/chat';

// Raw message type for realtime matching chat_messages table
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

export const useChatRooms = () => {
  const queryClient = useQueryClient();
  const { setRooms, addRoom, updateRoom } = useChatStore();
  const isConfigured = isSupabaseConfigured();

  const query = useQuery({
    queryKey: ['chatRooms'],
    queryFn: chatService.getRooms,
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: isConfigured,
  });

  // Update store when data changes
  useEffect(() => {
    if (query.data) {
      setRooms(query.data);
    }
  }, [query.data, setRooms]);

  // Real-time subscription for new messages (to update room list)
  useEffect(() => {
    if (!isConfigured || !supabase) return;

    const channel = supabase
      .channel('chat_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const msg = payload.new as RawChatMessage;

          // Check if room already exists
          const existingRooms = query.data || [];
          const roomExists = existingRooms.some(
            (room) => room.order_id === msg.order_id
          );

          if (!roomExists) {
            // Add new room
            const newRoom: ChatRoom = {
              id: String(msg.chat_id),
              name: `Order #${msg.order_id}`,
              type: 'order',
              order_id: msg.order_id,
              created_at: msg.created_at,
              is_active: true,
              last_message_at: msg.created_at,
              last_message_preview: msg.message_text || '',
            };
            addRoom(newRoom);
          } else {
            // Update existing room's last message
            updateRoom(String(msg.chat_id), {
              last_message_at: msg.created_at,
              last_message_preview: msg.message_text || '',
            });
          }

          // Invalidate to get fresh data
          queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
        }
      )
      .subscribe((status, err) => {
        console.log('Chat rooms subscription status:', status);
        if (err) {
          console.error('Chat rooms subscription error:', err);
        }
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to chat rooms');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error. Check if chat_messages table exists and realtime is enabled.');
        } else if (status === 'TIMED_OUT') {
          console.error('Chat rooms subscription timed out');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addRoom, updateRoom, queryClient, isConfigured, query.data]);

  // Get or create room for an order
  const getOrCreateRoom = async (orderId: number): Promise<ChatRoom> => {
    return chatService.getOrCreateRoom(orderId);
  };

  return {
    rooms: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error?.message,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    getOrCreateRoom,
    isConfigured,
  };
};

export default useChatRooms;
