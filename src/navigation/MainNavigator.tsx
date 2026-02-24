import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { MainTabParamList } from './types';
import { DashboardScreen } from '../screens/home';
import { OrdersNavigator } from './OrdersNavigator';
// import { TodayOrdersScreen } from '../screens/orders/TodayOrdersScreen'; // Temporarily hidden
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
      {/* Temporarily hidden
      <Tab.Screen
        name="Today"
        component={TodayOrdersScreen}
        options={{
          tabBarLabel: t('navigation.today'),
        }}
      />
      */}
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
