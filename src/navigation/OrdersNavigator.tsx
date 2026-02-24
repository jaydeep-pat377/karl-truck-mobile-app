import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OrdersStackParamList } from './types';
import { OrderListScreen } from '../screens/orders/OrderListScreen';
import { OrderDetailsScreen } from '../screens/orders/OrderDetailsScreen';

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export const OrdersNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="OrderList" component={OrderListScreen} />
      <Stack.Screen name="OrderDetailInTab" component={OrderDetailsScreen} />
    </Stack.Navigator>
  );
};

export default OrdersNavigator;
