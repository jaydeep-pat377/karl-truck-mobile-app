
import { getSocket } from '../services/socketClient';

export async function testNotificationConnection(userId: string): Promise<boolean> {
  const socket = getSocket();
  return !!socket?.connected;
}

export function subscribeToNotifications(
  userId: string,
  tenantId: number | null,
  onInsert: (payload: any) => void,
  onStatusChange: (status: string) => void
): { unsubscribe: () => void } {
  const socket = getSocket();
  if (!socket) {
    onStatusChange('CLOSED');
    return { unsubscribe: () => {} };
  }

  socket.emit('join:notifications', { user_id: userId });

  const handleNotification = (payload: any) => {
    onInsert(payload);
  };

  socket.on('notifications:new', handleNotification);

  if (socket.connected) {
    onStatusChange('SUBSCRIBED');
  }

  const handleConnect = () => onStatusChange('SUBSCRIBED');
  const handleDisconnect = () => onStatusChange('CLOSED');

  socket.on('connect', handleConnect);
  socket.on('disconnect', handleDisconnect);

  return {
    unsubscribe: () => {
      socket.off('notifications:new', handleNotification);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    },
  };
}

export function unsubscribeFromNotifications(subscription: { unsubscribe: () => void } | null): void {
  subscription?.unsubscribe();
}
