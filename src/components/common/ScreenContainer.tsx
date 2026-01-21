import React from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Platform,
  ViewStyle,
  StyleProp,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
  Edge,
} from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

interface ScreenContainerProps {
  children: React.ReactNode;
  /**
   * Edges to apply safe area insets. Defaults to ['top'] for consistent top spacing.
   * Use ['top', 'bottom'] for screens without tab bar.
   */
  edges?: Edge[];
  /**
   * Custom background color. If not provided, uses theme background color.
   */
  backgroundColor?: string;
  /**
   * Whether to use a plain View instead of SafeAreaView.
   * Useful when you need manual control over insets.
   */
  usePlainView?: boolean;
  /**
   * Custom style for the container.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Status bar style. Defaults to theme-aware style.
   */
  statusBarStyle?: 'light-content' | 'dark-content';
  /**
   * Whether to hide the status bar. Defaults to false.
   */
  hideStatusBar?: boolean;
  /**
   * Status bar background color for Android.
   * Defaults to transparent for edge-to-edge design.
   */
  statusBarBackgroundColor?: string;
  /**
   * Whether the status bar should be translucent on Android.
   * Defaults to true for consistent behavior with iOS.
   */
  statusBarTranslucent?: boolean;
}

/**
 * ScreenContainer Component
 *
 * A reusable container that provides consistent safe area handling
 * across all screens for both Android and iOS devices.
 *
 * Features:
 * - Consistent top safe area inset (handles notches, status bars, dynamic island)
 * - Theme-aware background color
 * - Proper StatusBar configuration
 * - Cross-platform compatibility (Android & iOS)
 * - Flexible edge configuration
 *
 * @example
 * // Basic usage - top safe area only (recommended for screens with tab bar)
 * <ScreenContainer>
 *   <YourContent />
 * </ScreenContainer>
 *
 * @example
 * // Full safe area (for screens without tab bar like modals)
 * <ScreenContainer edges={['top', 'bottom']}>
 *   <YourContent />
 * </ScreenContainer>
 *
 * @example
 * // Custom background color
 * <ScreenContainer backgroundColor={colors.primary.main}>
 *   <YourContent />
 * </ScreenContainer>
 *
 * @example
 * // Access insets manually
 * const insets = useSafeAreaInsets();
 * <ScreenContainer usePlainView>
 *   <View style={{ paddingTop: insets.top }}>
 *     <YourContent />
 *   </View>
 * </ScreenContainer>
 */
export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  edges = ['top'],
  backgroundColor,
  usePlainView = false,
  style,
  statusBarStyle,
  hideStatusBar = false,
  statusBarBackgroundColor,
  statusBarTranslucent = true,
}) => {
  const { isDark, theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Determine background color
  const bgColor = backgroundColor ?? theme.colors.background;

  // Determine status bar style based on theme or prop
  const barStyle = statusBarStyle ?? (isDark ? 'light-content' : 'dark-content');

  // Status bar background - transparent for edge-to-edge on Android
  const statusBgColor = statusBarBackgroundColor ?? 'transparent';

  const containerStyle = [
    styles.container,
    { backgroundColor: bgColor },
    style,
  ];

  // Common StatusBar component
  const StatusBarComponent = (
    <StatusBar
      barStyle={barStyle}
      backgroundColor={statusBgColor}
      translucent={Platform.OS === 'android' && statusBarTranslucent}
      hidden={hideStatusBar}
    />
  );

  if (usePlainView) {
    // Return plain View with manual inset handling
    return (
      <View style={containerStyle}>
        {StatusBarComponent}
        {children}
      </View>
    );
  }

  return (
    <SafeAreaView style={containerStyle} edges={edges}>
      {StatusBarComponent}
      {children}
    </SafeAreaView>
  );
};

/**
 * Hook to get safe area insets for manual control
 * Re-exported from react-native-safe-area-context for convenience
 */
export { useSafeAreaInsets };

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ScreenContainer;
