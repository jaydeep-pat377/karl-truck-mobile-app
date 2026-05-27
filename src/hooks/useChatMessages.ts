import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import Toast from 'react-native-toast-message';
import { chatService, ImageAttachment, AudioAttachment } from '../api/services/chatService';
import { useChatStore } from '../store/chatStore';
import { supabase, isSupabaseConfigured } from '../services/supabase/supabaseClient';
import { Message } from '../types/chat';
import { useAuthStore } from '../store/authStore';
import { playMessageSound } from '../utils/notificationSound';

interface UseChatMessagesProps {
  chatId?: number;
  orderId: number;
}

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

export const useChatMessages = ({ chatId, orderId }: UseChatMessagesProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isConfigured = isSupabaseConfigured();
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
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimeRef = useRef<string | null>(null);
  const currentRoomIdRef = useRef(currentRoomId);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    currentRoomIdRef.current = currentRoomId;
  }, [currentRoomId]);

  useEffect(() => {
    if (user?.id) {
      setSupabaseUserId(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isConfigured) return;

    setCurrentRoom(roomId);
    markRoomAsRead(roomId);

    return () => {
      setCurrentRoom(null);
      setRealtimeMessages([]);
    };
  }, [roomId, setCurrentRoom, markRoomAsRead, isConfigured]);

  const query = useQuery({
    queryKey: ['chatMessages', orderId],
    queryFn: () => chatService.getMessages(orderId),
    enabled: !!orderId && isConfigured,
    staleTime: 30 * 1000,
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
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [query.data, realtimeMessages]);

  const pollForNewMessages = useCallback(async () => {
    if (!orderId || !isConfigured) return;

    try {
      const messages = await chatService.getMessages(orderId, 20);
      if (messages.length > 0) {
        const latestMessage = messages[messages.length - 1];

        if (lastMessageTimeRef.current && latestMessage.created_at > lastMessageTimeRef.current) {
          const newMessages = messages.filter(
            (msg) =>
              msg.created_at > (lastMessageTimeRef.current || '') &&
              msg.sender_id !== supabaseUserId
          );

          if (newMessages.length > 0) {
            if (currentRoomIdRef.current !== roomId) {
              playMessageSound();
            }

            newMessages.forEach((msg) => {
              setRealtimeMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) {
                  return prev;
                }
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
  }, [orderId, roomId, supabaseUserId, addMessage, isConfigured]);

  useEffect(() => {
    if (!orderId || !isConfigured || !supabase) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let disposed = false;

    const setupSubscription = () => {
      if (disposed) return;

      try {
        channel = supabase
          .channel(`chat-order-${orderId}-${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
              filter: `order_id=eq.${orderId}`,
            },
            (payload) => {
              try {
                const msg = payload.new as RawChatMessage;

                if (supabaseUserId && msg.sender_id === supabaseUserId) {
                  return;
                }

                if (msg.is_deleted) {
                  return;
                }

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
                  content: msg.message_text || '',
                  message_type: messageType,
                  attachments,
                  created_at: msg.created_at,
                  is_deleted: msg.is_deleted,
                  timeline_visible: msg.timeline_visible,
                };

                setRealtimeMessages((prev) => {
                  if (prev.some((m) => m.id === newMessage.id)) {
                    return prev;
                  }
                  return [...prev, newMessage];
                });

                addMessage(roomId, newMessage);

                if (currentRoomIdRef.current !== roomId) {
                  incrementUnreadCount(roomId);
                  playMessageSound();
                }

                lastMessageTimeRef.current = msg.created_at;
              } catch (payloadError) {
                console.warn('[Chat] Error processing realtime payload:', payloadError);
              }
            }
          )
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              setIsRealtimeConnected(true);
              retryCountRef.current = 0;
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || err) {
              setIsRealtimeConnected(false);

              if (channel) {
                supabase.removeChannel(channel);
                channel = null;
              }

              if (!disposed && retryCountRef.current < 5) {
                const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
                retryCountRef.current += 1;
                retryTimerRef.current = setTimeout(setupSubscription, delay);
              }
            } else if (status === 'CLOSED') {
              setIsRealtimeConnected(false);
            }
          });
      } catch (error) {
        console.warn('[Chat] Failed to setup realtime, using polling:', error);
        setIsRealtimeConnected(false);
      }
    };

    setupSubscription();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        queryClient.invalidateQueries({ queryKey: ['chatMessages', orderId] });

        if (channel) {
          channel.subscribe();
        } else {
          retryCountRef.current = 0;
          setupSubscription();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      disposed = true;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      subscription.remove();
    };
  }, [orderId, roomId, supabaseUserId, addMessage, incrementUnreadCount, isConfigured, queryClient]);

  // Start polling as fallback when realtime is not connected; stop when it connects
  const pollFnRef = useRef(pollForNewMessages);
  useEffect(() => { pollFnRef.current = pollForNewMessages; }, [pollForNewMessages]);

  useEffect(() => {
    if (isRealtimeConnected) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    } else if (orderId && isConfigured) {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = setInterval(() => pollFnRef.current(), 5000);
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isRealtimeConnected, orderId, isConfigured]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, images, audio }: { content: string; images?: ImageAttachment[]; audio?: AudioAttachment }) => {
      try {
        if (audio) {
          return chatService.sendVoiceMessage(
            {
              chat_id: chatId || orderId,
              order_id: orderId,
              content: content || '',
            },
            audio
          );
        }
        if (images && images.length > 0) {
          const result = await chatService.sendMessageWithImages(
            {
              chat_id: chatId || orderId,
              order_id: orderId,
              content,
            },
            images
          );
          return result;
        }
        return chatService.sendMessage({
          chat_id: chatId || orderId,
          order_id: orderId,
          content,
        });
      } catch (error) {
        throw error;
      }
    },
    onMutate: async ({ content, images, audio }) => {
      let senderName = 'Unknown';
      if (user?.fullName) {
        senderName = user.fullName;
      } else if (user?.firstName || user?.lastName) {
        senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      } else if (user?.email) {
        senderName = user.email.split('@')[0];
      }

      let senderRole = 'contractor';
      const role = (user?.role || '').toLowerCase();
      if (role === 'admin' || role === 'administrator') {
        senderRole = 'admin';
      } else if (role === 'producer' || role === 'concrete_producer' || role === 'plant') {
        senderRole = 'concrete_producer';
      }

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
        chat_id: chatId || orderId,
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
          m.id.startsWith('temp-') && m.content === newMessage.content ? newMessage : m
        )
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
    [sendMessageMutation]
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
    const olderMessages = await chatService.getMessages(
      orderId,
      50,
      oldestMessage.created_at
    );

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
