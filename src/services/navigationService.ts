
import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function isNavigationReady(): boolean {
  return navigationRef.isReady();
}

export function navigate<T extends keyof RootStackParamList>(
  name: T,
  params?: RootStackParamList[T]
): void {
  if (navigationRef.isReady()) {

    navigationRef.navigate(name, params);
  } else {

    console.warn('[NavigationService] Navigation not ready, queuing:', name);
    setTimeout(() => navigate(name, params), 500);
  }
}

export function navigateToTab(tabName: 'Home' | 'Orders' | 'Notifications' | 'Settings'): void {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.navigate({
        name: 'Main',
        params: {
          screen: tabName,
        },
      })
    );
  } else {
    console.warn('[NavigationService] Navigation not ready, queuing tab:', tabName);
    setTimeout(() => navigateToTab(tabName), 500);
  }
}

export function navigateFromNotification(data: Record<string, string | unknown>): void {
  const eventCode = (data.event_code as string)?.toUpperCase() || '';
  const orderId = data.order_id as string;
  const orderCode = data.order_code as string;
  const orderDate = data.order_date as string;
  const ticketCode = data.ticket_code as string;
  const chatId = data.chat_id as string;
  const roomId = data.room_id as string;

  console.log('[NavigationService] Navigating from notification:', { eventCode, data });


  if (eventCode.includes('ORDER')) {
    if (orderId && orderCode && orderDate) {
      navigate('OrderDetail', {
        orderId,
        orderCode,
        orderDate,
      });
    } else {

      navigateToTab('Orders');
    }
    return;
  }


  if (eventCode.includes('TRUCK')) {
    if (orderId && orderCode && orderDate) {
      navigate('OrderDetail', {
        orderId,
        orderCode,
        orderDate,
      });
    } else {
      navigateToTab('Orders');
    }
    return;
  }


  if (eventCode.includes('TICKET')) {
    if (orderCode && orderDate && ticketCode) {
      navigate('TicketDetail', {
        orderCode,
        orderDate,
        ticketCode,
      });
    } else if (orderId && orderCode && orderDate) {
      navigate('Ticket', {
        orderId,
        orderCode,
        orderDate,
      });
    } else {
      navigateToTab('Orders');
    }
    return;
  }


  if (eventCode.includes('CHAT') || eventCode.includes('MESSAGE')) {
    if (roomId && chatId) {
      navigate('ChatRoom', {
        roomId,
        roomName: (data.room_name as string) || 'Chat',
        chatId: parseInt(chatId, 10),
        orderId: parseInt(orderId || '0', 10),
      });
    } else {

      navigateToTab('Orders');
    }
    return;
  }


  if (eventCode.includes('WEATHER') || eventCode.includes('ALERT')) {
    if (orderCode && orderDate) {
      navigate('Weather', {
        orderCode,
        orderDate,
      });
    } else {
      navigateToTab('Home');
    }
    return;
  }


  navigateToTab('Notifications');
}

export function resetNavigation(): void {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      })
    );
  }
}
