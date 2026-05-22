import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OrdersStackParamList } from './types';
import { OrderListScreen } from '../screens/orders/OrderListScreen';
import { OrderDetailsScreen } from '../screens/orders/OrderDetailsScreen';
import { OrdersRedesignScreen } from '../screens/playground/orders-redesign/OrdersRedesignScreen';
import { CompactListScreen } from '../screens/playground/orders-redesign/direction-c/CompactListScreen';
import { TimelineScreen } from '../screens/playground/orders-redesign/direction-d/TimelineScreen';
import { HeroFocusScreen } from '../screens/playground/orders-redesign/direction-e/HeroFocusScreen';

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
      <Stack.Screen name="OrdersRedesign" component={OrdersRedesignScreen} />
      <Stack.Screen name="OrdersRedesignC" component={CompactListScreen} />
      <Stack.Screen name="OrdersRedesignD" component={TimelineScreen} />
      <Stack.Screen name="OrdersRedesignE" component={HeroFocusScreen} />
    </Stack.Navigator>
  );
};

export default OrdersNavigator;
