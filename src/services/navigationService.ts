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
  // Normalize field names — handle both snake_case (FCM) and camelCase (Supabase/notifee)
  const eventCode = ((data.event_code || data.eventCode) as string)?.toUpperCase() || '';
  const orderId = (data.order_id || data.orderId || data.entity_id || data.entityId) as string;
  const orderCode = (data.order_code || data.orderCode) as string;
  const orderDate = (data.order_date || data.orderDate) as string;
  const ticketCode = (data.ticket_code || data.ticketCode) as string;
  const chatId = (data.chat_id || data.chatId) as string;
  const roomId = (data.room_id || data.roomId) as string;

  // Use orderId as orderCode fallback (they are often identical)
  const effectiveOrderId = orderId || orderCode || '';
  const effectiveOrderCode = orderCode || orderId || '';

  if (eventCode.includes('ORDER')) {
    if (effectiveOrderId || effectiveOrderCode) {
      navigate('OrderDetail', {
        orderId: effectiveOrderId,
        orderCode: effectiveOrderCode,
        orderDate: orderDate || '',
      });
    } else {
      navigateToTab('Orders');
    }
    return;
  }

  if (eventCode.includes('TRUCK')) {
    if (effectiveOrderId || effectiveOrderCode) {
      navigate('OrderDetail', {
        orderId: effectiveOrderId,
        orderCode: effectiveOrderCode,
        orderDate: orderDate || '',
      });
    } else {
      navigateToTab('Orders');
    }
    return;
  }

  if (eventCode.includes('TICKET')) {
    if (effectiveOrderCode && orderDate && ticketCode) {
      navigate('TicketDetail', {
        orderCode: effectiveOrderCode,
        orderDate,
        ticketCode,
      });
    } else if (effectiveOrderId && effectiveOrderCode && orderDate) {
      navigate('Ticket', {
        orderId: effectiveOrderId,
        orderCode: effectiveOrderCode,
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
        roomName: ((data.room_name || data.roomName) as string) || 'Chat',
        chatId: parseInt(chatId, 10),
        orderId: parseInt(effectiveOrderId || '0', 10),
      });
    } else {
      navigateToTab('Orders');
    }
    return;
  }

  if (eventCode.includes('WEATHER') || eventCode.includes('ALERT')) {
    if (effectiveOrderCode && orderDate) {
      navigate('Weather', {
        orderCode: effectiveOrderCode,
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
