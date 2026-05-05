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

// Retry-until-ready wrapper for dispatch — needed by killed-state notification
// taps where getInitialNotification() resolves before NavigationContainer
// finishes mounting AND before the auth store rehydrates and the nested
// navigators register all their conditional tabs (e.g. OrderRequests is only
// rendered when appPermissions.includes('order_request')).
//
// Three gates we must clear before dispatching:
//   1. navigationRef.isReady()      → container has mounted
//   2. top-level target route exists (e.g. "Main")
//   3. nested target screen exists in that route's sub-state
//      (e.g. "OrderRequests" tab is registered inside Main's bottom-tab nav)
//
// Total budget: 60 × 500ms = 30s, generous enough for slow cold boots and
// for the auth store to rehydrate appPermissions from AsyncStorage.
type RouteState = {
  routes?: { name: string; state?: RouteState }[];
};

function nestedTargetMounted(
  state: RouteState | undefined,
  action: Parameters<typeof navigationRef.dispatch>[0],
): boolean {
  const payload = (action as { payload?: { name?: string; params?: { screen?: string } } }).payload;
  if (!payload?.name) return true; // not a navigate action, skip the check

  const topRoute = state?.routes?.find((r) => r.name === payload.name);
  if (!topRoute) return false;

  const nestedScreen = payload.params?.screen;
  if (!nestedScreen) return true;

  return !!topRoute.state?.routes?.find((r) => r.name === nestedScreen);
}

function dispatchWhenReady(
  action: Parameters<typeof navigationRef.dispatch>[0],
  retries = 60,
): void {
  if (navigationRef.isReady()) {
    const rootState = navigationRef.getRootState() as RouteState | undefined;
    if (nestedTargetMounted(rootState, action)) {
      navigationRef.dispatch(action);
      return;
    }
  }

  if (retries <= 0) {
    const payload = (action as { payload?: { name?: string; params?: { screen?: string } } }).payload;
    console.warn(
      '[NavigationService] dispatch dropped — target route never became available:',
      payload?.name,
      '>',
      payload?.params?.screen,
    );
    return;
  }
  setTimeout(() => dispatchWhenReady(action, retries - 1), 500);
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

  console.log('[NavFromNotif] eventCode=', eventCode, 'orderId=', orderId, 'orderCode=', orderCode, 'orderDate=', orderDate);

  // Use orderId as orderCode fallback (they are often identical)
  const effectiveOrderId = orderId || orderCode || '';
  const effectiveOrderCode = orderCode || orderId || '';

  // Order Request chat → navigate into Main → OrderRequests stack →
  // OrderRequestDetail. MUST be checked before the generic ORDER branch
  // because eventCode 'ORDER_REQUEST_MESSAGE' also contains 'ORDER'.
  if (
    eventCode.includes('ORDER_REQUEST') ||
    eventCode.includes('REQUEST_MESSAGE') ||
    (data.type as string) === 'order_request_message'
  ) {
    const orderRequestId = (data.order_entity_id ||
      data.orderRequestId ||
      data.orderEntityId) as string;
    if (orderRequestId) {
      dispatchWhenReady(
        CommonActions.navigate({
          name: 'Main',
          params: {
            screen: 'OrderRequests',
            params: {
              screen: 'OrderRequestDetail',
              // scrollToMessages flag tells the detail screen to jump to the
              // chat section + last message on mount — only set when we land
              // here from a notification tap.
              params: { orderRequestId, scrollToMessages: true },
            },
          },
        }),
      );
    } else {
      dispatchWhenReady(
        CommonActions.navigate({ name: 'Main', params: { screen: 'OrderRequests' } }),
      );
    }
    return;
  }

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
      const customerName = (data.customer_name || data.customerName) as string;
      const projectName = (data.project_name || data.projectName) as string;
      const deliveryAddress = (data.delivery_address || data.deliveryAddress) as string;
      navigate('ChatRoom', {
        roomId,
        roomName: ((data.room_name || data.roomName) as string) || 'Chat',
        chatId: parseInt(chatId, 10),
        orderId: parseInt(effectiveOrderId || '0', 10),
        orderDate: orderDate || undefined,
        customerName: customerName || undefined,
        projectName: projectName || undefined,
        deliveryAddress: deliveryAddress || undefined,
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
