import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from './Text';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';

type LoaderSize = 'small' | 'medium' | 'large';

interface ContentLoaderProps {
  isLoading: boolean;
  message?: string;
  size?: LoaderSize;
  fullScreen?: boolean;
  children?: React.ReactNode;
}

const sizeMap: Record<LoaderSize, 'small' | 'large'> = {
  small: 'small',
  medium: 'large',
  large: 'large',
};

const indicatorSizeMap: Record<LoaderSize, number> = {
  small: ms(24),
  medium: ms(36),
  large: ms(48),
};

export const ContentLoader: React.FC<ContentLoaderProps> = ({
  isLoading,
  message,
  size = 'medium',
  fullScreen = false,
  children,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <View
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
        { backgroundColor: themeColors.background },
      ]}
    >
      <View style={styles.loaderWrapper}>
        <ActivityIndicator
          size={sizeMap[size]}
          color={colors.primary.main}
          style={{ transform: [{ scale: size === 'large' ? 1.2 : 1 }] }}
        />
        {message && (
          <Text
            variant="body"
            color="secondary"
            style={styles.message}
          >
            {message}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  loaderWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  message: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default ContentLoader;
