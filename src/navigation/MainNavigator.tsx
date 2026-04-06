import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { MainTabParamList } from './types';
import { DashboardScreen } from '../screens/home';
import { OrdersNavigator } from './OrdersNavigator';

import { NotificationScreen } from '../screens/notifications/NotificationScreen';
import { SettingsNavigator } from './SettingsNavigator';
import { OrderRequestsNavigator } from './OrderRequestsNavigator';
import { CustomTabBar } from '../components/navigation';
import { useAuthStore } from '../store/authStore';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator: React.FC = () => {
  const { t } = useTranslation();
  const appPermissions = useAuthStore((s) => s.appPermissions);

  const hasOrderRequests = appPermissions.includes('order_request');

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="Home"
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('navigation.home'),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersNavigator}
        options={{
          tabBarLabel: t('navigation.orders'),
        }}
      />

      <Tab.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{
          tabBarLabel: t('navigation.notifications'),
        }}
      />
      {hasOrderRequests && (
        <Tab.Screen
          name="OrderRequests"
          component={OrderRequestsNavigator}
          options={{
            tabBarLabel: t('navigation.orderRequests'),
          }}
        />
      )}
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
