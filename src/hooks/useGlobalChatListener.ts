import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabaseAdmin, isSupabaseConfigured } from '../services/supabase/supabaseClient';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';

interface RawChatMessage {
  id: number;
  chat_id: number;
  order_id: number;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  message_text: string | null;
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

    const setupSubscription = () => {
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

              // Toast/sound are intentionally not fired here — FCM push
              // (notificationService.displayChatNotification) handles them.
              useChatStore.getState().incrementUnreadCount(messageRoomId);
            } catch (error) {
              console.error('[GlobalChatListener] Error:', error);
            }
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.error('[GlobalChatListener] Error:', err);
          }
          if (status === 'SUBSCRIBED') {
            console.log('[GlobalChatListener] Connected!');
          }
        });
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      appStateRef.current = nextAppState;
    };

    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    setupSubscription();

    return () => {
      if (channelRef.current) {
        supabaseAdmin.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      appStateSub.remove();
    };
  }, [user?.id, isConfigured]);
};

export default useGlobalChatListener;
