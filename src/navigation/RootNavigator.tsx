import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { OrderDetailsScreen } from '../screens/orders/OrderDetailsScreen';
import { TicketScreen } from '../screens/orders/TicketScreen';
import { TicketDetailScreen } from '../screens/orders/TicketDetailScreen';
import { WeatherScreen, ProductDetailsScreen, ProductCodeScreen, EvaporationListScreen } from '../screens/weather';
import { MapTrackingScreen } from '../screens/tracking/MapTrackingScreen';
import { OrderTrackingScreen } from '../screens/tracking/OrderTrackingScreen';
import { ChatRoomScreen } from '../screens/chat/ChatRoomScreen';
import { useAuthStore } from '../store/authStore';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const theme = useAppTheme();
  const { isAuthenticated, isInitialized, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

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
            name="MapTracking"
            component={MapTrackingScreen}
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
