import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getSocket } from '../services/socketClient';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { playMessageSound } from '../utils/notificationSound';

export const useGlobalChatListener = () => {
  const { user } = useAuthStore();
  const { currentRoomId } = useChatStore();

  const currentRoomIdRef = useRef(currentRoomId);
  const userIdRef = useRef(user?.id);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    currentRoomIdRef.current = currentRoomId;
  }, [currentRoomId]);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket();
    if (!socket) return;

    // Join the orders room to receive chat:message broadcasts
    socket.emit('join:orders');

    const handleChatMessage = (payload: any) => {
      try {
        const msg = payload.new || payload;

        if (msg.sender_id === userIdRef.current) return;
        if (msg.is_deleted) return;
        if (appStateRef.current !== 'active') return;

        const messageRoomId = String(msg.order_id);
        if (currentRoomIdRef.current === messageRoomId) return;

        const store = useChatStore.getState();
        store.incrementUnreadCount(messageRoomId);

        // Trigger chat toast on the order list screen
        store.setLatestToast({
          orderId: msg.order_id,
          orderCode: msg.order_code || '',
          senderName: msg.sender_name || 'Someone',
          messagePreview: msg.message_text || msg.content || 'New message',
          timestamp: Date.now(),
        });

        playMessageSound();
      } catch (error) {
        console.error('[GlobalChatListener] Error:', error);
      }
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      appStateRef.current = nextAppState;
    };

    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    socket.on('chat:message', handleChatMessage);

    return () => {
      socket.off('chat:message', handleChatMessage);
      appStateSub.remove();
    };
  }, [user?.id]);
};

export default useGlobalChatListener;
