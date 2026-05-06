import React, { useEffect, lazy, Suspense } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { useAuthStore } from '../store/authStore';
import { useTimezoneStore } from '../store/timezoneStore';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useGlobalChatListener } from '../hooks/useGlobalChatListener';

// Lazy-load detail/modal screens — not needed until user navigates
const LazyOrderDetailsScreen = lazy(() => import('../screens/orders/OrderDetailsScreen'));
const LazyTodayOrdersScreen = lazy(() => import('../screens/orders/TodayOrdersScreen'));
const LazyTicketScreen = lazy(() => import('../screens/orders/TicketScreen'));
const LazyTicketDetailScreen = lazy(() => import('../screens/orders/TicketDetailScreen'));
const LazyOrderProductDetailsScreen = lazy(() => import('../screens/orders/OrderProductDetailsScreen'));
const LazyWeatherScreen = lazy(() => import('../screens/weather/WeatherScreen'));
const LazyProductDetailsScreen = lazy(() => import('../screens/weather/ProductDetailsScreen'));
const LazyProductCodeScreen = lazy(() => import('../screens/weather/ProductCodeScreen'));
const LazyEvaporationListScreen = lazy(() => import('../screens/weather/EvaporationListScreen'));
const LazyOrderTrackingScreen = lazy(() => import('../screens/tracking/OrderTrackingScreen'));
const LazyChatRoomScreen = lazy(() => import('../screens/chat/ChatRoomScreen'));
const LazyWebViewScreen = lazy(() => import('../screens/settings/WebViewScreen'));

const withSuspense = (LazyComponent: React.LazyExoticComponent<React.ComponentType<any>>) => {
  return (props: any) => (
    <Suspense fallback={<View style={styles.loadingContainer}><ActivityIndicator size="large" /></View>}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

const OrderDetailsScreen = withSuspense(LazyOrderDetailsScreen);
const TodayOrdersScreen = withSuspense(LazyTodayOrdersScreen);
const TicketScreen = withSuspense(LazyTicketScreen);
const TicketDetailScreen = withSuspense(LazyTicketDetailScreen);
const OrderProductDetailsScreen = withSuspense(LazyOrderProductDetailsScreen);
const WeatherScreen = withSuspense(LazyWeatherScreen);
const ProductDetailsScreen = withSuspense(LazyProductDetailsScreen);
const ProductCodeScreen = withSuspense(LazyProductCodeScreen);
const EvaporationListScreen = withSuspense(LazyEvaporationListScreen);
const OrderTrackingScreen = withSuspense(LazyOrderTrackingScreen);
const ChatRoomScreen = withSuspense(LazyChatRoomScreen);
const WebViewScreen = withSuspense(LazyWebViewScreen);

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const theme = useAppTheme();
  const { isAuthenticated, isInitialized, isLoading, initialize } = useAuthStore();


  useGlobalChatListener();

  useEffect(() => {
    initialize();
    useTimezoneStore.getState().loadTimezone();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated) {
      useTimezoneStore.getState().syncFromDb();
    }
  }, [isAuthenticated]);

  if (!isInitialized || isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        animation: 'fade',
      }}>
      {isAuthenticated ? (

        <>
          <Stack.Screen name="Main" component={MainNavigator} />
          <Stack.Screen
            name="OrderDetail"
            component={OrderDetailsScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="TodayOrders"
            component={TodayOrdersScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Weather"
            component={WeatherScreen}
            options={{
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="ProductDetails"
            component={ProductDetailsScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="ProductCode"
            component={ProductCodeScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="EvaporationList"
            component={EvaporationListScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Ticket"
            component={TicketScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="TicketDetail"
            component={TicketDetailScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Tracking"
            component={OrderTrackingScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="ChatRoom"
            component={ChatRoomScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="OrderProductDetails"
            component={OrderProductDetailsScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="WebView"
            component={WebViewScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
        </>
      ) : (

        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RootNavigator;
