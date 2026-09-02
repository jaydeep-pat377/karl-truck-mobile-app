import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import Toast from 'react-native-toast-message';
import { chatService, ImageAttachment, AudioAttachment } from '../api/services/chatService';
import { useChatStore } from '../store/chatStore';
import { getSocket } from '../services/socketClient';
import { Message } from '../types/chat';
import { useAuthStore } from '../store/authStore';
import { playMessageSound } from '../utils/notificationSound';

interface UseChatMessagesProps {
  chatId?: number;
  orderId: string | number;
}

export const useChatMessages = ({ chatId, orderId }: UseChatMessagesProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const roomId = String(orderId);
  const {
    setMessages,
    addMessage,
    setCurrentRoom,
    markRoomAsRead,
    incrementUnreadCount,
    currentRoomId,
  } = useChatStore();

  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageTimeRef = useRef<string | null>(null);

  useEffect(() => {
    setCurrentRoom(roomId);
    markRoomAsRead(roomId);

    return () => {
      setCurrentRoom(null);
      setRealtimeMessages([]);
    };
  }, [roomId, setCurrentRoom, markRoomAsRead]);

  const query = useQuery({
    queryKey: ['chatMessages', orderId],
    queryFn: () => chatService.getMessages(orderId),
    enabled: !!orderId,
    staleTime: 5 * 1000,
    refetchInterval: 5000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (query.data) {
      setMessages(roomId, query.data);
      if (query.data.length > 0) {
        const latestMsg = query.data[query.data.length - 1];
        lastMessageTimeRef.current = latestMsg.created_at;
      }
    }
  }, [query.data, roomId, setMessages]);

  const mergedMessages = useMemo(() => {
    const messageMap = new Map<string, Message>();
    (query.data || []).forEach((msg) => messageMap.set(msg.id, msg));
    realtimeMessages.forEach((msg) => messageMap.set(msg.id, msg));
    return Array.from(messageMap.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [query.data, realtimeMessages]);

  const pollForNewMessages = useCallback(async () => {
    if (!orderId) return;

    try {
      const messages = await chatService.getMessages(orderId, 20);
      if (messages.length > 0) {
        const latestMessage = messages[messages.length - 1];
        if (lastMessageTimeRef.current && latestMessage.created_at > lastMessageTimeRef.current) {
          const newMessages = messages.filter(
            (msg) =>
              msg.created_at > (lastMessageTimeRef.current || '') &&
              msg.sender_id !== user?.id,
          );
          if (newMessages.length > 0) {
            if (currentRoomId !== roomId) {
              playMessageSound();
            }
            newMessages.forEach((msg) => {
              setRealtimeMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
              });
              addMessage(roomId, msg);
            });
          }
        }
        lastMessageTimeRef.current = latestMessage.created_at;
      }
    } catch (err) {
      console.log('[Chat Poll] Error:', err);
    }
  }, [orderId, roomId, user?.id, addMessage, currentRoomId]);

  // Socket.io realtime subscription
  useEffect(() => {
    if (!orderId) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('join:chat', orderId);

    const handleChatMessage = (payload: any) => {
      try {
        const msg = payload.new || payload;

        if (user?.id && msg.sender_id === user.id) return;
        if (msg.is_deleted) return;

        const attachments = msg.attachments || [];
        let messageType: 'text' | 'image' | 'audio' = 'text';
        if (attachments.length > 0) {
          const first = attachments[0] as any;
          const aType = (first?.type || '') as string;
          const aUrl = (first?.url || first?.file_url || first?.path || '') as string;
          if (aType.includes('audio') || /\.(m4a|mp4|mp3|wav|aac|ogg)($|\?)/i.test(aUrl) || first?.duration != null) {
            messageType = 'audio';
          } else if (aType.includes('image') || /\.(jpg|jpeg|png|gif|webp|bmp)($|\?)/i.test(aUrl)) {
            messageType = 'image';
          }
        }

        const newMessage: Message = {
          id: String(msg.id),
          room_id: String(msg.order_id),
          chat_id: msg.chat_id,
          order_id: msg.order_id,
          sender_id: msg.sender_id,
          sender_name: msg.sender_name || 'User',
          sender_role: msg.sender_role || 'contractor',
          content: msg.message_text || msg.content || '',
          message_type: messageType,
          attachments,
          created_at: msg.created_at,
          is_deleted: msg.is_deleted,
          timeline_visible: msg.timeline_visible,
        };

        setRealtimeMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
        addMessage(roomId, newMessage);

        if (currentRoomId !== roomId) {
          incrementUnreadCount(roomId);
          playMessageSound();
        }
        lastMessageTimeRef.current = msg.created_at;
      } catch (payloadError) {
        console.warn('[Chat] Error processing realtime payload:', payloadError);
      }
    };

    const handleConnect = () => setIsRealtimeConnected(true);
    const handleDisconnect = () => setIsRealtimeConnected(false);

    socket.on('chat:message', handleChatMessage);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    setIsRealtimeConnected(socket.connected);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        queryClient.invalidateQueries({ queryKey: ['chatMessages', orderId] });
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Polling as safety net
    const pollInterval = isRealtimeConnected ? 15000 : 5000;
    pollingIntervalRef.current = setInterval(pollForNewMessages, pollInterval);

    return () => {
      socket.emit('leave:chat', orderId);
      socket.off('chat:message', handleChatMessage);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      subscription.remove();
    };
  }, [orderId, roomId, user?.id, addMessage, incrementUnreadCount, currentRoomId, queryClient, pollForNewMessages]);

  // Adjust poll interval when realtime status changes
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    if (orderId) {
      const pollInterval = isRealtimeConnected ? 15000 : 5000;
      pollingIntervalRef.current = setInterval(pollForNewMessages, pollInterval);
    }
  }, [isRealtimeConnected, orderId, pollForNewMessages]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, images, audio }: { content: string; images?: ImageAttachment[]; audio?: AudioAttachment }) => {
      if (audio) {
        return chatService.sendVoiceMessage(
          { chat_id: chatId || undefined, order_id: orderId, content: content || '' },
          audio,
        );
      }
      if (images && images.length > 0) {
        return chatService.sendMessageWithImages(
          { chat_id: chatId || undefined, order_id: orderId, content },
          images,
        );
      }
      return chatService.sendMessage({
        chat_id: chatId || undefined,
        order_id: orderId,
        content,
      });
    },
    onMutate: async ({ content, images, audio }) => {
      let senderName = 'Unknown';
      if (user?.fullName) senderName = user.fullName;
      else if (user?.firstName || user?.lastName) senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      else if (user?.email) senderName = user.email.split('@')[0];

      let senderRole = 'contractor';
      const role = (user?.role || '').toLowerCase();
      if (role === 'admin' || role === 'administrator') senderRole = 'admin';
      else if (role === 'producer' || role === 'concrete_producer' || role === 'plant') senderRole = 'concrete_producer';

      const optimisticAttachments = audio
        ? [{ url: audio.uri, type: audio.type, name: audio.name, duration: audio.duration }]
        : images
          ? images.map(img => ({ url: img.uri, type: img.type, name: img.name }))
          : [];

      const messageType = audio ? 'audio' as const
        : images && images.length > 0 && !content ? 'image' as const
        : 'text' as const;

      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        room_id: roomId,
        chat_id: chatId || undefined,
        order_id: orderId,
        sender_id: user?.id || '',
        sender_name: senderName,
        sender_role: senderRole,
        content: content,
        message_type: messageType,
        attachments: optimisticAttachments,
        created_at: new Date().toISOString(),
        is_deleted: false,
        timeline_visible: true,
      };

      addMessage(roomId, optimisticMessage);
      setRealtimeMessages((prev) => [...prev, optimisticMessage]);
      return { optimisticMessage };
    },
    onSuccess: (newMessage) => {
      setRealtimeMessages((prev) =>
        prev.map((m) =>
          m.id.startsWith('temp-') && m.content === newMessage.content ? newMessage : m,
        ),
      );
    },
    onError: (error: any) => {
      setRealtimeMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
      queryClient.invalidateQueries({ queryKey: ['chatMessages', orderId] });
      Toast.show({
        type: 'error',
        text1: 'Failed to Send',
        text2: error?.message || 'Could not send message. Please try again.',
        position: 'top',
        visibilityTime: 5000,
        autoHide: true,
        topOffset: 50,
      });
    },
  });

  const sendMessage = useCallback(
    (content: string, images?: ImageAttachment[], audio?: AudioAttachment) => {
      return sendMessageMutation.mutateAsync({ content, images, audio });
    },
    [sendMessageMutation],
  );

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => chatService.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', orderId] });
    },
  });

  const loadMore = useCallback(async () => {
    if (mergedMessages.length === 0) return;
    const oldestMessage = mergedMessages[0];
    const olderMessages = await chatService.getMessages(orderId, 50, oldestMessage.created_at);
    if (olderMessages.length > 0) {
      setMessages(roomId, [...olderMessages, ...mergedMessages]);
    }
  }, [orderId, roomId, mergedMessages, setMessages]);

  return {
    messages: mergedMessages,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error?.message,
    sendMessage,
    isSending: sendMessageMutation.isPending,
    deleteMessage: (messageId: string) => deleteMessageMutation.mutateAsync(messageId),
    loadMore,
    refetch: query.refetch,
    isRealtimeConnected,
  };
};

export default useChatMessages;
