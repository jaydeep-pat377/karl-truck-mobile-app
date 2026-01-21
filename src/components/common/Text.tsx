import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { typography } from '../../theme';

type TextVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'bodyLarge'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'captionSmall'
  | 'label'
  | 'button'
  | 'buttonSmall'
  | 'temperatureLarge'
  | 'temperatureMedium'
  | 'orderNumber'
  | 'statusBadge';

type TextColor = 'primary' | 'secondary' | 'disabled' | 'hint' | 'error' | 'success' | 'warning' | 'white';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'primary',
  align = 'left',
  style,
  children,
  ...props
}) => {
  const theme = useAppTheme();

  const getColor = (): string => {
    switch (color) {
      case 'primary':
        return theme.colors.text;
      case 'secondary':
        return theme.colors.textSecondary;
      case 'disabled':
        return theme.colors.textDisabled;
      case 'hint':
        return theme.colors.textHint;
      case 'error':
        return theme.colors.error.main;
      case 'success':
        return theme.colors.success.main;
      case 'warning':
        return theme.colors.warning.main;
      case 'white':
        return theme.colors.common.white;
      default:
        return theme.colors.text;
    }
  };

  const textStyle = [
    typography[variant],
    { color: getColor(), textAlign: align },
    style,
  ];

  return (
    <RNText style={textStyle} {...props}>
      {children}
    </RNText>
  );
};

export default Text;
