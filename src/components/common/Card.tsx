
import React from 'react';
import {
  View,
  ViewProps,
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';

type CardVariant = 'default' | 'elevated' | 'outlined';

interface CardProps extends ViewProps {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  onPress,
  style,
  children,
  ...props
}) => {
  const theme = useAppTheme();

  const getBackgroundColor = (): string => {
    switch (variant) {
      case 'elevated':
        return theme.colors.cardElevated;
      default:
        return theme.colors.card;
    }
  };

  const getPadding = (): number => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return theme.spacing.sm;
      case 'lg':
        return theme.spacing.lg;
      default:
        return theme.spacing.md;
    }
  };

  const getShadow = () => {
    switch (variant) {
      case 'elevated':
        return theme.shadows.md;
      default:
        return theme.shadows.sm;
    }
  };

  const cardStyle = [
    styles.card,
    {
      backgroundColor: getBackgroundColor(),
      padding: getPadding(),
      borderRadius: theme.borderRadius.md,
      borderWidth: variant === 'outlined' ? 1 : 0,
      borderColor: theme.colors.border,
    },
    variant !== 'outlined' && getShadow(),
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.7}
        {...(props as TouchableOpacityProps)}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {

    overflow: 'visible',
  },
});

export default Card;
