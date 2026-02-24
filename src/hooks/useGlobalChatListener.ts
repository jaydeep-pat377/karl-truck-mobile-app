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

/**
 * Global chat message listener that plays notification sounds
 * when messages are received and user is not on that chat screen.
 *
 * This hook should be used once at the app level (e.g., in RootNavigator).
 *
 * Flow:
 * 1. Subscribes to ALL chat_messages INSERT events via Supabase Realtime
 * 2. When message arrives:
 *    - Filters out own messages
 *    - Filters out deleted messages
 *    - Only plays if app is in foreground
 *    - Only plays if user is NOT viewing that chat room
 * 3. Plays notification sound (auto-throttled)
 */
export const useGlobalChatListener = () => {
  const { user } = useAuthStore();
  const { currentRoomId } = useChatStore();
  const isConfigured = isSupabaseConfigured();

  // Use refs for values accessed in callbacks
  const currentRoomIdRef = useRef(currentRoomId);
  const userIdRef = useRef(user?.id);
  const appStateRef = useRef(AppState.currentState);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Keep refs updated
  useEffect(() => {
    currentRoomIdRef.current = currentRoomId;
  }, [currentRoomId]);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  // Initialize sound on mount
  useEffect(() => {
    console.log('[GlobalChatListener] Initializing sound on mount...');
    initMessageSound().then((success) => {
      console.log('[GlobalChatListener] Sound init result:', success);
    });
  }, []);

  // Main subscription effect
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

              // Filter 1: Ignore own messages
              if (msg.sender_id === userIdRef.current) {
                console.log('[GlobalChatListener] Skipped - own message');
                return;
              }

              // Filter 2: Ignore deleted
              if (msg.is_deleted) {
                console.log('[GlobalChatListener] Skipped - deleted');
                return;
              }

              // Filter 3: Only foreground
              if (appStateRef.current !== 'active') {
                console.log('[GlobalChatListener] Skipped - app not active');
                return;
              }

              // Filter 4: Not viewing this chat
              const messageRoomId = String(msg.order_id);
              if (currentRoomIdRef.current === messageRoomId) {
                console.log('[GlobalChatListener] Skipped - viewing this chat');
                return;
              }

              // All filters passed - play sound!
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

    // App state handler
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('[GlobalChatListener] App state:', appStateRef.current, '->', nextAppState);
      appStateRef.current = nextAppState;
    };

    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    setupSubscription();

    // Cleanup
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
