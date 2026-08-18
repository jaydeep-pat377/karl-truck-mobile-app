import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { chatService } from '../api/services/chatService';
import { useChatStore } from '../store/chatStore';
import { getSocket } from '../services/socketClient';
import { ChatRoom } from '../types/chat';

export const useChatRooms = () => {
  const queryClient = useQueryClient();
  const { setRooms, addRoom, updateRoom } = useChatStore();

  const query = useQuery({
    queryKey: ['chatRooms'],
    queryFn: chatService.getRooms,
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) {
      setRooms(query.data);
    }
  }, [query.data, setRooms]);

  // Socket.io subscription for new chat messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleChatMessage = (payload: any) => {
      try {
        const msg = payload.new || payload;
        const existingRooms = query.data || [];
        const roomExists = existingRooms.some(
          (room) => room.order_id === msg.order_id,
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
            last_message_preview: msg.message_text || msg.content || '',
          };
          addRoom(newRoom);
        } else {
          updateRoom(String(msg.chat_id), {
            last_message_at: msg.created_at,
            last_message_preview: msg.message_text || msg.content || '',
          });
        }

        queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      } catch (payloadError) {
        console.warn('Error processing chat message payload:', payloadError);
      }
    };

    socket.on('chat:message', handleChatMessage);

    return () => {
      socket.off('chat:message', handleChatMessage);
    };
  }, [addRoom, updateRoom, queryClient, query.data]);

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
    isConfigured: true,
  };
};

export default useChatRooms;
