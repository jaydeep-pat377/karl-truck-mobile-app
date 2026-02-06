
import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { Text } from './Text';
import { Icon } from './Icon';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends Omit<TouchableOpacityProps, 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  ...props
}) => {
  const theme = useAppTheme();

  const getBackgroundColor = (): string => {
    switch (variant) {
      case 'primary':
        return theme.colors.primary.main;
      case 'secondary':
        return theme.colors.secondary.main;
      case 'outline':
      case 'ghost':
        return 'transparent';
      case 'danger':
        return theme.colors.error.main;
      default:
        return theme.colors.primary.main;
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        return theme.colors.common.white;
      case 'outline':
        return theme.colors.primary.main;
      case 'ghost':
        return theme.colors.text;
      default:
        return theme.colors.common.white;
    }
  };

  const getBorderColor = (): string => {
    switch (variant) {
      case 'outline':
        return theme.colors.primary.main;
      default:
        return 'transparent';
    }
  };

  const getHeight = (): number => {
    switch (size) {
      case 'small':
        return theme.componentHeight.buttonSmall;
      case 'large':
        return theme.componentHeight.buttonLarge;
      default:
        return theme.componentHeight.button;
    }
  };

  const getPadding = (): number => {
    switch (size) {
      case 'small':
        return theme.spacing.sm;
      case 'large':
        return theme.spacing.lg;
      default:
        return theme.spacing.md;
    }
  };

  const getIconSize = (): number => {
    switch (size) {
      case 'small':
        return theme.iconSize.sm;
      case 'large':
        return theme.iconSize.lg;
      default:
        return theme.iconSize.md;
    }
  };

  const getOpacity = (): number => {
    if (disabled && !loading) return 0.5;
    if (loading) return 0.7;
    return 1;
  };

  const buttonStyle = [
    styles.button,
    {
      backgroundColor: getBackgroundColor(),
      borderColor: getBorderColor(),
      borderWidth: variant === 'outline' ? 1.5 : 0,
      height: getHeight(),
      paddingHorizontal: getPadding(),
      borderRadius: theme.borderRadius.md,
      opacity: getOpacity(),
    },
    fullWidth && styles.fullWidth,
    style,
  ];

  const textVariant = size === 'small' ? 'buttonSmall' : size === 'large' ? 'buttonLarge' : 'button';
  const iconSize = getIconSize();
  const textColor = getTextColor();

  return (
    <TouchableOpacity
      style={buttonStyle}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      <View style={styles.content}>
        {loading && (
          <ActivityIndicator
            color={textColor}
            size="small"
            style={styles.loader}
          />
        )}
        {!loading && leftIcon && (
          <Icon
            name={leftIcon}
            size={iconSize}
            color={textColor}
            style={styles.leftIcon}
          />
        )}
        <Text variant={textVariant} style={{ color: textColor }}>
          {title}
        </Text>
        {!loading && rightIcon && (
          <Icon
            name={rightIcon}
            size={iconSize}
            color={textColor}
            style={styles.rightIcon}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  loader: {
    marginRight: 8,
  },
});

export default Button;
