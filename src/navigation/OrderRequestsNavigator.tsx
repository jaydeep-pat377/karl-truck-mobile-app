import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OrderRequestsStackParamList } from './types';
import { OrderRequestListScreen } from '../screens/order-requests/OrderRequestListScreen';
import { OrderRequestDetailScreen } from '../screens/order-requests/OrderRequestDetailScreen';
import { CreateOrderRequestScreen } from '../screens/order-requests/CreateOrderRequestScreen';
import { AddressMapScreen } from '../screens/order-requests/AddressMapScreen';

const Stack = createNativeStackNavigator<OrderRequestsStackParamList>();

export const OrderRequestsNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="OrderRequestList" component={OrderRequestListScreen} />
      <Stack.Screen name="OrderRequestDetail" component={OrderRequestDetailScreen} />
      <Stack.Screen name="CreateOrderRequest" component={CreateOrderRequestScreen} />
      <Stack.Screen name="AddressMap" component={AddressMapScreen} />
    </Stack.Navigator>
  );
};

export default OrderRequestsNavigator;
