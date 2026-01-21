import React, { memo, useMemo } from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { ms } from '../../utils/responsive';

export type GradientDirection =
  | 'vertical'
  | 'horizontal'
  | 'diagonal'
  | 'diagonalReverse';

export type GradientVariant =
  | 'primary'
  | 'primarySubtle'
  | 'secondary'
  | 'secondarySubtle'
  | 'surface'
  | 'header';

interface GradientHeaderProps {
  children: React.ReactNode;
  variant?: GradientVariant;
  direction?: GradientDirection;
  customColors?: string[];
  style?: StyleProp<ViewStyle>;
  includeTopSafeArea?: boolean;
  borderRadius?: number;
}

const getGradientPoints = (direction: GradientDirection) => {
  switch (direction) {
    case 'horizontal':
      return { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };
    case 'diagonal':
      return { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
    case 'diagonalReverse':
      return { start: { x: 1, y: 0 }, end: { x: 0, y: 1 } };
    case 'vertical':
    default:
      return { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } };
  }
};

export const GradientHeader: React.FC<GradientHeaderProps> = memo(({
  children,
  variant = 'primarySubtle',
  direction = 'vertical',
  customColors,
  style,
  includeTopSafeArea = false,
  borderRadius = ms(20),
}) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const gradientColors = useMemo(() => {
    if (customColors && customColors.length >= 2) {
      return customColors;
    }
    const themeGradients = isDark ? colors.gradients.dark : colors.gradients.light;
    return themeGradients[variant];
  }, [isDark, variant, customColors]);

  const { start, end } = useMemo(() => getGradientPoints(direction), [direction]);

  const containerStyle = useMemo((): ViewStyle[] => {
    const baseStyles: ViewStyle[] = [
      styles.container,
      {
        borderBottomLeftRadius: borderRadius,
        borderBottomRightRadius: borderRadius,
      },
    ];

    if (includeTopSafeArea) {
      baseStyles.push({ paddingTop: insets.top });
    }

    return baseStyles;
  }, [borderRadius, includeTopSafeArea, insets.top]);

  return (
    <LinearGradient
      colors={gradientColors}
      start={start}
      end={end}
      style={[containerStyle, style]}>
      {children}
    </LinearGradient>
  );
});

GradientHeader.displayName = 'GradientHeader';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default GradientHeader;
