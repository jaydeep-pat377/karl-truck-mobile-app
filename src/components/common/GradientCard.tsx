import React, { memo, useMemo } from 'react';
import {
  StyleSheet,
  ViewStyle,
  StyleProp,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { ms } from '../../utils/responsive';

export type GradientCardDirection =
  | 'vertical'
  | 'horizontal'
  | 'diagonal'
  | 'diagonalReverse';

export type GradientCardVariant =
  | 'primary'
  | 'primarySubtle'
  | 'secondary'
  | 'secondarySubtle'
  | 'surface'
  | 'accent';

interface GradientCardProps {
  children: React.ReactNode;

  variant?: GradientCardVariant;

  direction?: GradientCardDirection;

  customColors?: string[];

  style?: StyleProp<ViewStyle>;

  borderRadius?: number;

  withShadow?: boolean;

  gradientOpacity?: number;
}

const getGradientPoints = (direction: GradientCardDirection) => {
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

const getCardGradientColors = (
  variant: GradientCardVariant,
  isDark: boolean
): string[] => {
  const themeGradients = isDark ? colors.gradients.dark : colors.gradients.light;

  switch (variant) {
    case 'primary':

      return isDark
        ? [`${colors.primary.dark}15`, `${colors.primary.main}08`]
        : [`${colors.primary.light}20`, `${colors.primary.main}08`];
    case 'primarySubtle':

      return themeGradients.primarySubtle;
    case 'secondary':

      return isDark
        ? [`${colors.secondary.dark}15`, `${colors.secondary.main}08`]
        : [`${colors.secondary.light}20`, `${colors.secondary.main}08`];
    case 'secondarySubtle':

      return themeGradients.secondarySubtle;
    case 'accent':

      return isDark
        ? [`${colors.primary.main}12`, `${colors.secondary.main}08`]
        : [`${colors.primary.light}15`, `${colors.secondary.light}10`];
    case 'surface':
    default:

      return themeGradients.surface;
  }
};

export const GradientCard: React.FC<GradientCardProps> = memo(({
  children,
  variant = 'surface',
  direction = 'diagonal',
  customColors,
  style,
  borderRadius = ms(16),
  withShadow = true,
  gradientOpacity = 1,
}) => {
  const { isDark } = useTheme();

  const gradientColors = useMemo(() => {
    if (customColors && customColors.length >= 2) {
      return customColors;
    }
    return getCardGradientColors(variant, isDark);
  }, [isDark, variant, customColors]);

  const { start, end } = useMemo(
    () => getGradientPoints(direction),
    [direction]
  );

  const containerStyle = useMemo((): ViewStyle => ({
    borderRadius,
    overflow: 'hidden',
    ...(withShadow && {
      shadowColor: colors.common.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 4,
    }),
  }), [borderRadius, withShadow, isDark]);

  if (gradientOpacity < 1) {
    const themeColors = isDark ? colors.dark : colors.light;
    return (
      <View style={[containerStyle, { backgroundColor: themeColors.card }, style]}>
        <LinearGradient
          colors={gradientColors}
          start={start}
          end={end}
          style={[StyleSheet.absoluteFill, { opacity: gradientOpacity }]}
        />
        <View style={styles.content}>
          {children}
        </View>
      </View>
    );
  }

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

GradientCard.displayName = 'GradientCard';

const styles = StyleSheet.create({
  content: {
    position: 'relative',
    zIndex: 1,
  },
});

export default GradientCard;
