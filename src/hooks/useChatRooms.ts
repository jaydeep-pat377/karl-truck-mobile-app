import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { chatService } from '../api/services/chatService';
import { useChatStore } from '../store/chatStore';
import { supabase, isSupabaseConfigured } from '../services/supabase/supabaseClient';
import { ChatRoom, Message } from '../types/chat';

interface RawChatMessage {
  id: number;
  chat_id: string | number;
  order_id: string | number;
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

  useEffect(() => {
    if (query.data) {
      setRooms(query.data);
    }
  }, [query.data, setRooms]);

  useEffect(() => {
    if (!isConfigured || !supabase) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      try {
        channel = supabase
          .channel('chat_messages_changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
            },
            (payload) => {
              try {
                const msg = payload.new as RawChatMessage;

                const existingRooms = query.data || [];
                const roomExists = existingRooms.some(
                  (room) => room.order_id === msg.order_id
                );

                if (!roomExists) {

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

                  updateRoom(String(msg.chat_id), {
                    last_message_at: msg.created_at,
                    last_message_preview: msg.message_text || '',
                  });
                }

                queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
              } catch (payloadError) {
                console.warn('Error processing chat message payload:', payloadError);
              }
            }
          )
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              console.log('Successfully subscribed to chat rooms');
            } else if (status === 'CHANNEL_ERROR' || err) {

              console.warn('Chat realtime not available. Using polling fallback.');

              if (channel) {
                supabase.removeChannel(channel);
                channel = null;
              }
            }
          });
      } catch (error) {

        console.warn('Failed to setup chat realtime subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [addRoom, updateRoom, queryClient, isConfigured, query.data]);

  const getOrCreateRoom = async (orderId: string | number): Promise<ChatRoom> => {
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
