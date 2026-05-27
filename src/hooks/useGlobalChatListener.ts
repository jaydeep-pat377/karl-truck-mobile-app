import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabaseAdmin, isSupabaseConfigured } from '../services/supabase/supabaseClient';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { notificationService } from '../services/notificationService';
import { buildNotifKey, claimNotification } from '../utils/notificationDedup';
import { playMessageSound } from '../utils/notificationSound';

interface RawChatMessage {
  id: number;
  chat_id: number;
  order_id: number;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  message_text: string | null;
  attachments?: unknown[];
  created_at: string;
  is_deleted: boolean;
}

export const useGlobalChatListener = () => {
  const { user } = useAuthStore();
  const { currentRoomId } = useChatStore();
  const isConfigured = isSupabaseConfigured();

  const currentRoomIdRef = useRef(currentRoomId);
  const userIdRef = useRef(user?.id);
  const appStateRef = useRef(AppState.currentState);
  const channelRef = useRef<ReturnType<typeof supabaseAdmin.channel> | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    currentRoomIdRef.current = currentRoomId;
  }, [currentRoomId]);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  useEffect(() => {
    if (!isConfigured || !supabaseAdmin || !user?.id) {
      return;
    }

    let disposed = false;

    const setupSubscription = () => {
      if (disposed) return;

      const channelName = `global-chat-${user.id}-${Date.now()}`;

      channelRef.current = supabaseAdmin
        .channel(channelName)
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

              if (msg.sender_id === userIdRef.current) {
                return;
              }

              if (msg.is_deleted) {
                return;
              }

              if (appStateRef.current !== 'active') {
                return;
              }

              const messageRoomId = String(msg.order_id);
              if (currentRoomIdRef.current === messageRoomId) {
                return;
              }

              useChatStore.getState().incrementUnreadCount(messageRoomId);

              // Show local notification directly. The dedup layer
              // ensures that if FCM also delivers the same message,
              // only one banner is shown.
              const title = msg.sender_name || 'New message';
              const body = msg.message_text
                ? (msg.message_text.length > 120 ? `${msg.message_text.substring(0, 119)}…` : msg.message_text)
                : (Array.isArray(msg.attachments) && msg.attachments.length > 0 ? 'Sent an attachment' : 'New message');
              const dedupKey = buildNotifKey({ title, body });
              if (claimNotification(`display:${dedupKey}`)) {
                playMessageSound();
                notificationService.displayChatNotification(title, body, {
                  type: 'chat_message',
                  event_code: 'CHAT_MESSAGE',
                  message_id: String(msg.id),
                  order_id: String(msg.order_id),
                  chat_id: String(msg.chat_id),
                  room_id: messageRoomId,
                  sender_id: msg.sender_id,
                  sender_name: msg.sender_name || '',
                });
              }
            } catch (error) {
              console.error('[GlobalChatListener] Error:', error);
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            retryCountRef.current = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || err) {
            if (err) console.error('[GlobalChatListener] Error:', err);
            if (channelRef.current) {
              supabaseAdmin.removeChannel(channelRef.current);
              channelRef.current = null;
            }
            if (!disposed && retryCountRef.current < 5) {
              const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
              retryCountRef.current += 1;
              retryTimerRef.current = setTimeout(setupSubscription, delay);
            }
          }
        });
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      appStateRef.current = nextAppState;
      if (nextAppState === 'active' && !channelRef.current && !disposed) {
        retryCountRef.current = 0;
        setupSubscription();
      }
    };

    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    setupSubscription();

    return () => {
      disposed = true;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (channelRef.current) {
        supabaseAdmin.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      appStateSub.remove();
    };
  }, [user?.id, isConfigured]);
};

export default useGlobalChatListener;
