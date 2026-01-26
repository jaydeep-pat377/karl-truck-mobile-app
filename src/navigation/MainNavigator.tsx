import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { MainTabParamList } from './types';
import { DashboardScreen } from '../screens/home';
import { OrderListScreen } from '../screens/orders/OrderListScreen';
import { MapTrackingScreen } from '../screens/tracking/MapTrackingScreen';
import { NotificationScreen } from '../screens/notifications/NotificationScreen';
import { SettingsNavigator } from './SettingsNavigator';
import { CustomTabBar } from '../components/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="Home"
    >
      <Tab.Screen
        name="Orders"
        component={OrderListScreen}
        options={{
          tabBarLabel: t('navigation.orders'),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapTrackingScreen}
        options={{
          tabBarLabel: t('navigation.map'),
        }}
      />
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('navigation.home'),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{
          tabBarLabel: t('navigation.notifications'),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{
          tabBarLabel: t('navigation.settings'),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
