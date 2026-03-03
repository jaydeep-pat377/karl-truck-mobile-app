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

  edges?: Edge[];

  backgroundColor?: string;

  usePlainView?: boolean;

  style?: StyleProp<ViewStyle>;

  statusBarStyle?: 'light-content' | 'dark-content';

  hideStatusBar?: boolean;

  statusBarBackgroundColor?: string;

  statusBarTranslucent?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  edges = ['top', 'bottom'],
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

  const bgColor = backgroundColor ?? theme.colors.background;

  const barStyle = statusBarStyle ?? (isDark ? 'light-content' : 'dark-content');

  const statusBgColor = statusBarBackgroundColor ?? 'transparent';

  const containerStyle = [
    styles.container,
    { backgroundColor: bgColor },
    style,
  ];

  const StatusBarComponent = (
    <StatusBar
      barStyle={barStyle}
      backgroundColor={statusBgColor}
      translucent={Platform.OS === 'android' && statusBarTranslucent}
      hidden={hideStatusBar}
    />
  );

  if (usePlainView) {

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

export { useSafeAreaInsets };

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ScreenContainer;
