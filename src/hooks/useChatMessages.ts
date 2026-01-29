import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { chatService } from '../api/services/chatService';
import { useChatStore } from '../store/chatStore';
import { supabase, isSupabaseConfigured, ensureAuthenticated } from '../services/supabase/supabaseClient';
import { Message } from '../types/chat';
import { useAuthStore } from '../store/authStore';

interface UseChatMessagesProps {
  chatId?: number;
  orderId: number;
}

// Raw message type matching the chat_messages table
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

  // Get user ID on mount (use app user ID which is already a UUID)
  useEffect(() => {
    if (user?.id) {
      setSupabaseUserId(user.id);
    }
  }, [user?.id]);

  // Set current room on mount
  useEffect(() => {
    if (!isConfigured) return;

    setCurrentRoom(roomId);
    markRoomAsRead(roomId);

    return () => {
      setCurrentRoom(null);
      setRealtimeMessages([]);
    };
  }, [roomId, setCurrentRoom, markRoomAsRead, isConfigured]);

  // Fetch messages
  const query = useQuery({
    queryKey: ['chatMessages', orderId],
    queryFn: () => chatService.getMessages(orderId),
    enabled: !!orderId && isConfigured,
    staleTime: 30 * 1000, // 30 seconds - allow refetch after this time
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when app comes to foreground
  });

  // Update store when data changes
  useEffect(() => {
    if (query.data) {
      setMessages(roomId, query.data);
      // Track last message time for polling
      if (query.data.length > 0) {
        const latestMsg = query.data[query.data.length - 1];
        lastMessageTimeRef.current = latestMsg.created_at;
      }
    }
  }, [query.data, roomId, setMessages]);

  // Merge initial messages with realtime messages
  const mergedMessages = useCallback(() => {
    const messageMap = new Map<string, Message>();

    (query.data || []).forEach((msg) => messageMap.set(msg.id, msg));
    realtimeMessages.forEach((msg) => messageMap.set(msg.id, msg));

    return Array.from(messageMap.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [query.data, realtimeMessages]);

  // Polling function - primary method for getting new messages
  const pollForNewMessages = useCallback(async () => {
    if (!orderId || !isConfigured) return;

    try {
      const messages = await chatService.getMessages(orderId, 20);
      if (messages.length > 0) {
        const latestMessage = messages[messages.length - 1];

        // Check if we have new messages since last poll
        if (lastMessageTimeRef.current && latestMessage.created_at > lastMessageTimeRef.current) {
          console.log('[Chat Poll] New messages detected');

          // Find new messages from other users
          const newMessages = messages.filter(
            (msg) =>
              msg.created_at > (lastMessageTimeRef.current || '') &&
              msg.sender_id !== supabaseUserId
          );

          if (newMessages.length > 0) {
            console.log(`[Chat Poll] Found ${newMessages.length} new message(s)`);

            newMessages.forEach((msg) => {
              console.log(`[Chat Poll] Adding message from ${msg.sender_name}: ${msg.content.substring(0, 50)}`);
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

  // Real-time subscription for new messages
  useEffect(() => {
    if (!orderId || !isConfigured || !supabase) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let realtimeWorking = false;

    const setupSubscription = () => {
      console.log(`[Chat] Setting up realtime subscription for order ${orderId}`);

      channel = supabase
        .channel(`chat-order-${orderId}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'chat_messages',
            filter: `order_id=eq.${orderId}`,
          },
          (payload) => {
            console.log('[Chat] Realtime event received:', payload.eventType, payload);
            realtimeWorking = true;

            if (payload.eventType !== 'INSERT') {
              console.log('[Chat] Ignoring non-INSERT event');
              return;
            }

            const msg = payload.new as RawChatMessage;
            console.log('[Chat] New message from:', msg.sender_name, 'sender_id:', msg.sender_id);

            // Don't add if it's our own message (already added optimistically)
            if (supabaseUserId && msg.sender_id === supabaseUserId) {
              console.log('[Chat] Ignoring own message');
              return;
            }

            if (msg.is_deleted) {
              console.log('[Chat] Ignoring deleted message');
              return;
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
              message_type: 'text',
              attachments: msg.attachments || [],
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

            if (currentRoomId !== roomId) {
              incrementUnreadCount(roomId);
            }

            // Update last message time for polling
            lastMessageTimeRef.current = msg.created_at;
          }
        )
        .subscribe((status, err) => {
          console.log(`[Chat] Subscription status for order ${orderId}:`, status);
          if (err) {
            console.error(`[Chat] Subscription error:`, err);
            setIsRealtimeConnected(false);
          }
          if (status === 'SUBSCRIBED') {
            console.log(`[Chat] Successfully subscribed to realtime for order ${orderId}`);
            setIsRealtimeConnected(true);
            // Keep polling running as backup - realtime may not work due to RLS
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`[Chat] Channel error/timeout for order ${orderId}`);
            setIsRealtimeConnected(false);
          } else if (status === 'CLOSED') {
            console.log(`[Chat] Channel closed for order ${orderId}`);
            setIsRealtimeConnected(false);
          }
        });
    };

    setupSubscription();

    // Handle app state changes - reconnect when app becomes active
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('App became active, refreshing chat...');
        // Refresh messages when app becomes active
        queryClient.invalidateQueries({ queryKey: ['chatMessages', orderId] });

        // Reconnect channel if needed
        if (channel) {
          channel.subscribe();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Start polling every 2 seconds (primary method since realtime may be blocked by RLS)
    console.log('[Chat] Starting polling for new messages');
    pollingIntervalRef.current = setInterval(pollForNewMessages, 2000);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, roomId, supabaseUserId, addMessage, incrementUnreadCount, currentRoomId, isConfigured]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      chatService.sendMessage({
        chat_id: chatId || orderId,
        order_id: orderId,
        content,
      }),
    onMutate: async (content) => {
      // Get user name - use fullName, firstName+lastName, or email as fallback
      let senderName = 'Unknown';
      if (user?.fullName) {
        senderName = user.fullName;
      } else if (user?.firstName || user?.lastName) {
        senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      } else if (user?.email) {
        // Use part before @ as name
        senderName = user.email.split('@')[0];
      }

      // Map user role to allowed values
      let senderRole = 'contractor';
      const role = (user?.role || '').toLowerCase();
      if (role === 'admin' || role === 'administrator') {
        senderRole = 'admin';
      } else if (role === 'producer' || role === 'concrete_producer' || role === 'plant') {
        senderRole = 'concrete_producer';
      }

      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        room_id: roomId,
        chat_id: chatId || orderId,
        order_id: orderId,
        sender_id: user?.id || '',
        sender_name: senderName,
        sender_role: senderRole,
        content: content,
        message_type: 'text',
        attachments: [],
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
    onError: (error) => {
      console.log('Send message error:', error);
      setRealtimeMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
      queryClient.invalidateQueries({ queryKey: ['chatMessages', orderId] });
    },
  });

  const sendMessage = useCallback(
    (content: string) => {
      return sendMessageMutation.mutateAsync(content);
    },
    [sendMessageMutation]
  );

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => chatService.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', orderId] });
    },
  });

  // Load more messages
  const loadMore = useCallback(async () => {
    const messages = mergedMessages();
    if (messages.length === 0) return;

    const oldestMessage = messages[0];
    const olderMessages = await chatService.getMessages(
      orderId,
      50,
      oldestMessage.created_at
    );

    if (olderMessages.length > 0) {
      setMessages(roomId, [...olderMessages, ...messages]);
    }
  }, [orderId, roomId, mergedMessages, setMessages]);

  return {
    messages: mergedMessages(),
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
