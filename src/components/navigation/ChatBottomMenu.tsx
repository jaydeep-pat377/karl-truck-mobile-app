import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Icon, Text } from '../common';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { notifyScreenFocus } from '../../lib/queryClient';

// Kept in sync with CustomTabBar so this menu matches the app's tab bar.
const ICON_SIZE = ms(24);
const TAB_BAR_INNER_HEIGHT = ms(52);
const ACTIVE_PILL_WIDTH = ms(58);
const ACTIVE_PILL_HEIGHT = ms(62);
const INACTIVE_PILL_SIZE = ms(40);

type MenuItem = {
  name: string;
  label: string;
  icon: string;
  activeIcon: string;
  // Initial screen to land on for tabs backed by a nested navigator.
  initialScreen?: string;
};

const menuTheme = {
  light: {
    background: colors.tabBar.light.background,
    border: colors.primary.main,
    iconInactive: colors.tabBar.light.iconInactive,
    iconActive: colors.tabBar.light.iconActive,
    labelActive: colors.tabBar.light.labelActive,
    activePill: colors.primary.main,
    containerShadowColor: colors.common.black,
    containerShadowOpacity: 0.25,
    focusedShadowColor: colors.common.black,
    focusedShadowOpacity: 0.25,
  },
  dark: {
    background: colors.tabBar.dark.background,
    border: colors.primary.main,
    iconInactive: colors.tabBar.dark.iconInactive,
    iconActive: colors.tabBar.dark.iconActive,
    labelActive: colors.tabBar.dark.labelActive,
    activePill: colors.primary.main,
    containerShadowColor: colors.common.black,
    containerShadowOpacity: 0.6,
    focusedShadowColor: colors.primary.light,
    focusedShadowOpacity: 0.35,
  },
} as const;

/**
 * A standalone bottom navigation menu for screens that live on the root
 * stack (above the tab navigator) — e.g. the order ChatRoom screen — where
 * the real CustomTabBar from MainNavigator is not rendered.
 *
 * Visually mirrors CustomTabBar (same pill, sizes, label treatment).
 * Tapping an item navigates into the Main tab navigator, which pops the
 * current root screen and switches to the chosen tab.
 */
interface ChatBottomMenuProps {
  /** Tab to render as active. Defaults to 'Orders' since chat opens from the orders flow. */
  activeTab?: string;
}

export const ChatBottomMenu: React.FC<ChatBottomMenuProps> = ({ activeTab = 'Orders' }) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const theme = menuTheme[isDark ? 'dark' : 'light'];

  const appPermissions = useAuthStore((s) => s.appPermissions);
  const hasOrderRequests = appPermissions.includes('order_request');

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const items: MenuItem[] = [
    {
      name: 'Home',
      label: t('navigation.home'),
      icon: 'home-outline',
      activeIcon: 'home',
    },
    {
      name: 'Orders',
      label: t('navigation.orders'),
      icon: 'clipboard-text-outline',
      activeIcon: 'clipboard-text',
      initialScreen: 'OrderList',
    },
    {
      name: 'Notifications',
      label: t('navigation.notifications'),
      icon: 'bell-outline',
      activeIcon: 'bell',
    },
    ...(hasOrderRequests
      ? [
          {
            name: 'OrderRequests',
            label: t('navigation.orderRequests'),
            icon: 'file-document-edit-outline',
            activeIcon: 'file-document-edit',
            initialScreen: 'OrderRequestList',
          } as MenuItem,
        ]
      : []),
    {
      name: 'Settings',
      label: t('navigation.settings'),
      icon: 'cog-outline',
      activeIcon: 'cog',
      initialScreen: 'SettingsMain',
    },
  ];

  const handlePress = (item: MenuItem) => {
    navigation.navigate('Main', {
      screen: item.name,
      params: item.initialScreen ? { screen: item.initialScreen } : undefined,
    });
    notifyScreenFocus();
  };

  // Hide while the user is typing so the menu doesn't overlap the keyboard.
  if (keyboardVisible) {
    return null;
  }

  const minBottomPadding = Platform.OS === 'android' ? spacing.md : spacing.sm;
  const bottomPadding = Math.max(insets.bottom, minBottomPadding) + spacing.sm;

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.background,
            borderColor: theme.border,
            shadowColor: theme.containerShadowColor,
            shadowOpacity: theme.containerShadowOpacity,
          },
        ]}
      >
        {items.map((item) => {
          const isActive = item.name === activeTab;
          return (
            <TouchableOpacity
              key={item.name}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={isActive ? { selected: true } : {}}
              activeOpacity={0.75}
              onPress={() => handlePress(item)}
              style={styles.tabItem}
            >
              <View
                style={[
                  styles.pillContainer,
                  {
                    width: isActive ? ACTIVE_PILL_WIDTH : INACTIVE_PILL_SIZE,
                    height: isActive ? ACTIVE_PILL_HEIGHT : INACTIVE_PILL_SIZE,
                  },
                ]}
              >
                <View
                  style={[
                    styles.pillBackground,
                    isActive && {
                      backgroundColor: theme.activePill,
                      borderRadius: ms(20),
                      shadowColor: theme.focusedShadowColor,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: theme.focusedShadowOpacity,
                      shadowRadius: 12,
                      elevation: 8,
                    },
                  ]}
                />
                <View style={styles.contentContainer}>
                  <Icon
                    name={isActive ? item.activeIcon : item.icon}
                    size={ICON_SIZE}
                    color={isActive ? theme.iconActive : theme.iconInactive}
                  />
                  {isActive && (
                    <Text
                      style={[styles.label, { color: theme.labelActive }]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  bar: {
    flexDirection: 'row',
    height: TAB_BAR_INNER_HEIGHT,
    borderRadius: ms(28),
    borderWidth: 1.5,
    paddingHorizontal: ms(6),
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'visible',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 24,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  pillContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pillBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: ms(18),
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: ms(9),
    fontWeight: '600',
    letterSpacing: 0.4,
    marginTop: ms(2),
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});

export default ChatBottomMenu;
