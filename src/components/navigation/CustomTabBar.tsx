import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Keyboard,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { useTheme } from '../../contexts/ThemeContext';

const tabBarTheme = {
  light: {
    background: colors.tabBar.light.background,
    containerShadowColor: colors.common.black,
    containerShadowOpacity: 0.12,
    border: colors.tabBar.light.border,
    activePillBackground: colors.primary.main,
    activePillBorderColor: colors.primary.dark,
    focusedShadowColor: colors.common.black,
    focusedShadowOpacity: 0.25,
    focusedShadowRadius: 12,
    focusedElevation: 8,
    iconInactive: colors.tabBar.light.iconInactive,
    iconActive: colors.tabBar.light.iconActive,
    labelActive: colors.tabBar.light.labelActive,
  },
  dark: {
    background: colors.tabBar.dark.background,
    containerShadowColor: colors.common.black,
    containerShadowOpacity: 0.4,
    border: colors.common.transparent,
    activePillBackground: colors.primary.main,
    activePillBorderColor: colors.primary.light,
    focusedShadowColor: colors.primary.light,
    focusedShadowOpacity: 0.35,
    focusedShadowRadius: 14,
    focusedElevation: 10,
    iconInactive: colors.tabBar.dark.iconInactive,
    iconActive: colors.tabBar.dark.iconActive,
    labelActive: colors.tabBar.dark.labelActive,
  },
} as const;

export const TAB_BAR_HEIGHT = ms(70) + spacing.lg;
const TAB_BAR_INNER_HEIGHT = ms(52);

const ICON_SIZE = ms(24);
const ACTIVE_PILL_WIDTH = ms(58);
const ACTIVE_PILL_HEIGHT = ms(62);
const INACTIVE_PILL_SIZE = ms(40);

type ThemeType = keyof typeof tabBarTheme;

const getFocusedShadowStyle = (theme: ThemeType, isFocused: boolean) => {
  const themeColors = tabBarTheme[theme];

  if (!isFocused) {
    return {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    };
  }

  return {
    shadowColor: themeColors.focusedShadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: themeColors.focusedShadowOpacity,
    shadowRadius: themeColors.focusedShadowRadius,
    elevation: themeColors.focusedElevation,
  };
};
interface TabItemProps {
  route: any;
  index: number;
  state: any;
  descriptors: any;
  navigation: any;
  theme: ThemeType;
}

const TabItem: React.FC<TabItemProps> = ({
  route,
  index,
  state,
  descriptors,
  navigation,
  theme,
}) => {
  const { options } = descriptors[route.key];
  const isFocused = state.index === index;
  const themeColors = tabBarTheme[theme];

  const scaleAnim = useRef(new Animated.Value(isFocused ? 1 : 0.95)).current;
  const pillWidthAnim = useRef(
    new Animated.Value(isFocused ? ACTIVE_PILL_WIDTH : INACTIVE_PILL_SIZE),
  ).current;
  const pillHeightAnim = useRef(
    new Animated.Value(isFocused ? ACTIVE_PILL_HEIGHT : INACTIVE_PILL_SIZE),
  ).current;
  const labelOpacityAnim = useRef(
    new Animated.Value(isFocused ? 1 : 0),
  ).current;
  const labelHeightAnim = useRef(
    new Animated.Value(isFocused ? ms(12) : 0),
  ).current;

  // Animate on focus change
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1 : 0.95,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }),
      Animated.spring(pillWidthAnim, {
        toValue: isFocused ? ACTIVE_PILL_WIDTH : INACTIVE_PILL_SIZE,
        useNativeDriver: false,
        tension: 120,
        friction: 10,
      }),
      Animated.spring(pillHeightAnim, {
        toValue: isFocused ? ACTIVE_PILL_HEIGHT : INACTIVE_PILL_SIZE,
        useNativeDriver: false,
        tension: 120,
        friction: 10,
      }),
      Animated.timing(labelOpacityAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(labelHeightAnim, {
        toValue: isFocused ? ms(12) : 0,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [
    isFocused,
    scaleAnim,
    pillWidthAnim,
    pillHeightAnim,
    labelOpacityAnim,
    labelHeightAnim,
  ]);

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const onLongPress = () => {
    navigation.emit({
      type: 'tabLongPress',
      target: route.key,
    });
  };

  const getIconName = (): string => {
    switch (route.name) {
      case 'Home':
        return isFocused ? 'home' : 'home-outline';
      case 'Orders':
        return isFocused ? 'clipboard-text' : 'clipboard-text-outline';
      case 'Map':
        return isFocused ? 'map' : 'map-outline';
      case 'Notifications':
        return isFocused ? 'bell' : 'bell-outline';
      case 'Settings':
        return isFocused ? 'cog' : 'cog-outline';
      default:
        return 'circle';
    }
  };

  const label =
    typeof options.tabBarLabel === 'string'
      ? options.tabBarLabel
      : typeof options.title === 'string'
        ? options.title
        : route.name;

  const shadowStyle = getFocusedShadowStyle(theme, isFocused);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarTestID}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
      style={styles.tabItem}>
      <Animated.View
        style={[
          styles.pillContainer,
          {
            width: pillWidthAnim,
            height: pillHeightAnim,
          },
        ]}>
        <View
          style={[
            styles.pillBackground,
            {
              backgroundColor: isFocused
                ? themeColors.activePillBackground
                : 'transparent',
              borderRadius: isFocused ? ms(20) : 0,
              ...shadowStyle,
            },
          ]}
        />

        <View style={styles.contentContainer}>
          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }],
            }}>
            <Icon
              name={getIconName()}
              size={ICON_SIZE}
              color={isFocused ? themeColors.iconActive : themeColors.iconInactive}
            />
          </Animated.View>

          <Animated.View style={{ height: labelHeightAnim, overflow: 'hidden' }}>
            <Animated.Text
              style={[
                styles.label,
                {
                  opacity: labelOpacityAnim,
                  color: themeColors.labelActive,
                },
              ]}
              numberOfLines={1}>
              {label}
            </Animated.Text>
          </Animated.View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const theme: ThemeType = isDark ? 'dark' : 'light';
  const themeColors = tabBarTheme[theme];
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardShowEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardHideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(keyboardShowEvent, () => {
      Animated.timing(translateY, {
        toValue: 150,
        duration: Platform.OS === 'ios' ? 250 : 200,
        useNativeDriver: true,
      }).start();
    });

    const hideSubscription = Keyboard.addListener(keyboardHideEvent, () => {
      Animated.timing(translateY, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? 250 : 200,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : spacing.sm,
          transform: [{ translateY }]
        },
      ]}>
      <View
        style={[
          styles.tabBarContainer,
          {
            backgroundColor: themeColors.background,
            shadowColor: themeColors.containerShadowColor,
            shadowOpacity: themeColors.containerShadowOpacity,
            borderColor: themeColors.border,
            borderWidth: !isDark ? StyleSheet.hairlineWidth : 0,
          },
        ]}>
        {state.routes.map((route, index) => (
          <TabItem
            key={route.key}
            route={route}
            index={index}
            state={state}
            descriptors={descriptors}
            navigation={navigation}
            theme={theme}
          />
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  tabBarContainer: {
    flexDirection: 'row',
    height: TAB_BAR_INNER_HEIGHT,
    borderRadius: ms(28),
    paddingHorizontal: ms(6),
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'visible',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 16,
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

export default CustomTabBar;
