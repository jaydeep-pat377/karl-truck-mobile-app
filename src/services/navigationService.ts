/**
 * Navigation Service
 *
 * Provides navigation functionality accessible from outside React components.
 * Used for deep linking from push notifications.
 */
import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';

// Navigation reference for use outside of React components
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Check if navigation is ready
 */
export function isNavigationReady(): boolean {
  return navigationRef.isReady();
}

/**
 * Navigate to a screen
 */
export function navigate<T extends keyof RootStackParamList>(
  name: T,
  params?: RootStackParamList[T]
): void {
  if (navigationRef.isReady()) {
    // @ts-ignore - params type is complex
    navigationRef.navigate(name, params);
  } else {
    // Navigation not ready yet, queue for later
    console.warn('[NavigationService] Navigation not ready, queuing:', name);
    setTimeout(() => navigate(name, params), 500);
  }
}

/**
 * Navigate to a tab
 */
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

/**
 * Navigate based on notification event code and data
 * Used for deep linking from push notification taps
 */
export function navigateFromNotification(data: Record<string, string | unknown>): void {
  const eventCode = (data.event_code as string)?.toUpperCase() || '';
  const orderId = data.order_id as string;
  const orderCode = data.order_code as string;
  const orderDate = data.order_date as string;
  const ticketCode = data.ticket_code as string;
  const chatId = data.chat_id as string;
  const roomId = data.room_id as string;

  console.log('[NavigationService] Navigating from notification:', { eventCode, data });

  // Order-related events
  if (eventCode.includes('ORDER')) {
    if (orderId && orderCode && orderDate) {
      navigate('OrderDetail', {
        orderId,
        orderCode,
        orderDate,
      });
    } else {
      // Navigate to orders tab
      navigateToTab('Orders');
    }
    return;
  }

  // Truck-related events
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

  // Ticket-related events
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

  // Chat-related events
  if (eventCode.includes('CHAT') || eventCode.includes('MESSAGE')) {
    if (roomId && chatId) {
      navigate('ChatRoom', {
        roomId,
        roomName: (data.room_name as string) || 'Chat',
        chatId: parseInt(chatId, 10),
        orderId: parseInt(orderId || '0', 10),
      });
    } else {
      // Navigate to orders to find chat
      navigateToTab('Orders');
    }
    return;
  }

  // Weather/Alert events
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

  // Default: navigate to notifications tab
  navigateToTab('Notifications');
}

/**
 * Reset navigation to initial state
 */
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
