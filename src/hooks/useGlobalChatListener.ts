import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase, isSupabaseConfigured } from '../services/supabase/supabaseClient';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { playMessageSound, initMessageSound } from '../utils/notificationSound';

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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);


  useEffect(() => {
    currentRoomIdRef.current = currentRoomId;
  }, [currentRoomId]);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);


  useEffect(() => {
    console.log('[GlobalChatListener] Initializing sound on mount...');
    initMessageSound().then((success) => {
      console.log('[GlobalChatListener] Sound init result:', success);
    });
  }, []);


  useEffect(() => {
    if (!isConfigured || !supabase || !user?.id) {
      console.log('[GlobalChatListener] Not ready:', {
        isConfigured,
        hasSupabase: !!supabase,
        userId: user?.id
      });
      return;
    }

    const setupSubscription = () => {
      console.log('[GlobalChatListener] Setting up subscription for user:', user.id);

      const channelName = `global-chat-${user.id}-${Date.now()}`;

      channelRef.current = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
          },
          (payload) => {
            console.log('[GlobalChatListener] Message received!');

            try {
              const msg = payload.new as RawChatMessage;

              console.log('[GlobalChatListener] From:', msg.sender_name);
              console.log('[GlobalChatListener] Room:', msg.order_id);
              console.log('[GlobalChatListener] Current room:', currentRoomIdRef.current);
              console.log('[GlobalChatListener] App state:', appStateRef.current);


              if (msg.sender_id === userIdRef.current) {
                console.log('[GlobalChatListener] Skipped - own message');
                return;
              }


              if (msg.is_deleted) {
                console.log('[GlobalChatListener] Skipped - deleted');
                return;
              }


              if (appStateRef.current !== 'active') {
                console.log('[GlobalChatListener] Skipped - app not active');
                return;
              }


              const messageRoomId = String(msg.order_id);
              if (currentRoomIdRef.current === messageRoomId) {
                console.log('[GlobalChatListener] Skipped - viewing this chat');
                return;
              }


              console.log('[GlobalChatListener] Playing sound!');
              playMessageSound();

            } catch (error) {
              console.error('[GlobalChatListener] Error:', error);
            }
          }
        )
        .subscribe((status, err) => {
          console.log('[GlobalChatListener] Status:', status);
          if (err) {
            console.error('[GlobalChatListener] Error:', err);
          }
          if (status === 'SUBSCRIBED') {
            console.log('[GlobalChatListener] Connected!');
          }
        });
    };


    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('[GlobalChatListener] App state:', appStateRef.current, '->', nextAppState);
      appStateRef.current = nextAppState;
    };

    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    setupSubscription();


    return () => {
      console.log('[GlobalChatListener] Cleaning up');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      appStateSub.remove();
    };
  }, [user?.id, isConfigured]);
};

export default useGlobalChatListener;
