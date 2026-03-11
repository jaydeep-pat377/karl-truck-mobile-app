
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from './Text';
import { Icon } from './Icon';
import { OrderStatus, TruckStatus } from '../../types';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms } from '../../utils/responsive';

type BadgeSize = 'xsmall' | 'small' | 'medium' | 'large';

interface StatusBadgeProps {
  status: OrderStatus | TruckStatus | string;
  label?: string;
  size?: BadgeSize;
  customColor?: string;
}

const statusLabels: Record<string, string> = {
  NORMAL: 'Normal',
  Normal: 'Normal',
  WILL_CALL: 'Will Call',
  'Will Call': 'Will Call',
  WEATHER_PERMITTING: 'Weather',
  HOLD: 'On Hold',
  'Hold Delivery': 'On Hold',
  COMPLETED: 'Completed',
  Completed: 'Completed',
  WAIT_LIST: 'Wait List',
  'Wait List': 'Wait List',
  PRE_POUR: 'Pre-Pour',
  IN_PROCESS: 'In Progress',
  'In Progress': 'In Progress',
  CANCELLED: 'Voided',
  Canceled: 'Voided',
  Cancelled: 'Voided',
  DELAYED: 'Delayed',
  Delayed: 'Delayed',
  ENRT: 'En Route',
  ONSIT: 'On Site',
  LOADING: 'Loading',
  DISPATCHED: 'Dispatched',
  RETURNING: 'Returning',
};

const statusIcons: Record<string, string> = {
  NORMAL: 'checkbox-marked-circle-outline',
  Normal: 'checkbox-marked-circle-outline',
  WILL_CALL: 'phone-outline',
  'Will Call': 'phone-outline',
  WEATHER_PERMITTING: 'weather-partly-cloudy',
  HOLD: 'pause-circle-outline',
  'Hold Delivery': 'pause-circle-outline',
  COMPLETED: 'check-circle-outline',
  Completed: 'check-circle-outline',
  WAIT_LIST: 'clock-outline',
  'Wait List': 'clock-outline',
  PRE_POUR: 'timer-sand',
  IN_PROCESS: 'progress-clock',
  'In Progress': 'progress-clock',
  CANCELLED: 'close-circle-outline',
  Canceled: 'close-circle-outline',
  Cancelled: 'close-circle-outline',
  DELAYED: 'alert-circle-outline',
  Delayed: 'alert-circle-outline',
  ENRT: 'truck-delivery-outline',
  ONSIT: 'map-marker-check-outline',
  LOADING: 'package-variant',
  DISPATCHED: 'send-outline',
  RETURNING: 'keyboard-return',
};

interface StatusColorConfig {
  text: string;
  textDark: string;
  bgOpacity: number;
}

const statusColors: Record<string, StatusColorConfig> = {
  DELAYED: {
    text: colors.statusBadge.red.text,
    textDark: colors.statusBadge.red.textDark,
    bgOpacity: 0.1,
  },
  Delayed: {
    text: colors.statusBadge.red.text,
    textDark: colors.statusBadge.red.textDark,
    bgOpacity: 0.1,
  },
  CANCELLED: {
    text: colors.statusBadge.red.text,
    textDark: colors.statusBadge.red.textDark,
    bgOpacity: 0.1,
  },
  Canceled: {
    text: colors.statusBadge.red.text,
    textDark: colors.statusBadge.red.textDark,
    bgOpacity: 0.1,
  },
  Cancelled: {
    text: colors.statusBadge.red.text,
    textDark: colors.statusBadge.red.textDark,
    bgOpacity: 0.1,
  },
  PRE_POUR: {
    text: colors.statusBadge.amber.text,
    textDark: colors.statusBadge.amber.textDark,
    bgOpacity: 0.1,
  },
  WILL_CALL: {
    text: colors.statusBadge.yellow.text,
    textDark: colors.statusBadge.yellow.textDark,
    bgOpacity: 0.15,
  },
  'Will Call': {
    text: colors.statusBadge.yellow.text,
    textDark: colors.statusBadge.yellow.textDark,
    bgOpacity: 0.15,
  },
  WEATHER_PERMITTING: {
    text: colors.statusBadge.blue.text,
    textDark: colors.statusBadge.blue.textDark,
    bgOpacity: 0.1,
  },
  COMPLETED: {
    text: colors.statusBadge.green.text,
    textDark: colors.statusBadge.green.textDark,
    bgOpacity: 0.1,
  },
  Completed: {
    text: colors.statusBadge.green.text,
    textDark: colors.statusBadge.green.textDark,
    bgOpacity: 0.1,
  },
  IN_PROCESS: {
    text: colors.statusBadge.green.text,
    textDark: colors.statusBadge.green.textDark,
    bgOpacity: 0.1,
  },
  'In Progress': {
    text: colors.statusBadge.green.text,
    textDark: colors.statusBadge.green.textDark,
    bgOpacity: 0.1,
  },
  ONSIT: {
    text: colors.statusBadge.blue.text,
    textDark: colors.statusBadge.blue.textDark,
    bgOpacity: 0.1,
  },
  NORMAL: {
    text: colors.statusBadge.green.text,
    textDark: colors.statusBadge.green.textDark,
    bgOpacity: 0.1,
  },
  Normal: {
    text: colors.statusBadge.green.text,
    textDark: colors.statusBadge.green.textDark,
    bgOpacity: 0.1,
  },
  ENRT: {
    text: colors.statusBadge.purple.text,
    textDark: colors.statusBadge.purple.textDark,
    bgOpacity: 0.1,
  },
  DISPATCHED: {
    text: colors.statusBadge.purple.text,
    textDark: colors.statusBadge.purple.textDark,
    bgOpacity: 0.1,
  },
  HOLD: {
    text: colors.statusBadge.red.text,
    textDark: colors.statusBadge.red.textDark,
    bgOpacity: 0.1,
  },
  'Hold Delivery': {
    text: colors.statusBadge.red.text,
    textDark: colors.statusBadge.red.textDark,
    bgOpacity: 0.1,
  },
  WAIT_LIST: {
    text: colors.statusBadge.gray.text,
    textDark: colors.statusBadge.gray.textDark,
    bgOpacity: 0.12,
  },
  'Wait List': {
    text: colors.statusBadge.gray.text,
    textDark: colors.statusBadge.gray.textDark,
    bgOpacity: 0.12,
  },
  RETURNING: {
    text: colors.statusBadge.gray.text,
    textDark: colors.statusBadge.gray.textDark,
    bgOpacity: 0.12,
  },
  LOADING: {
    text: colors.statusBadge.blue.text,
    textDark: colors.statusBadge.blue.textDark,
    bgOpacity: 0.1,
  },
};

const defaultColorConfig: StatusColorConfig = {
  text: colors.statusBadge.gray.text,
  textDark: colors.statusBadge.gray.textDark,
  bgOpacity: 0.1,
};

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'medium',
  customColor,
}) => {
  const { isDark } = useTheme();


  const isCancelledStatus = status?.toLowerCase().includes('cancel');

  const colorConfig = isCancelledStatus
    ? statusColors['CANCELLED']
    : (statusColors[status] || defaultColorConfig);
  const displayLabel = label || (isCancelledStatus ? 'Voided' : (statusLabels[status] || status));


  const textColor = customColor || (isDark ? colorConfig.textDark : colorConfig.text);

  const baseColor = customColor || (isDark ? colorConfig.textDark : colorConfig.text);
  const backgroundColor = hexToRgba(baseColor, colorConfig.bgOpacity);

  const sizeConfig = {
    xsmall: {
      paddingHorizontal: ms(3),
      paddingVertical: ms(1),
      borderRadius: ms(4),
      fontSize: ms(7),
      letterSpacing: 0.1,
      gap: ms(2),
    },
    small: {
      paddingHorizontal: ms(6),
      paddingVertical: ms(0),
      borderRadius: ms(4),
      fontSize: ms(9),
      letterSpacing: 0.3,
      gap: ms(3),
    },
    medium: {
      paddingHorizontal: ms(8),
      paddingVertical: ms(2),
      borderRadius: ms(6),
      fontSize: ms(10),
      letterSpacing: 0.4,
      gap: ms(3),
    },
    large: {
      paddingHorizontal: ms(12),
      paddingVertical: ms(3),
      borderRadius: ms(8),
      fontSize: ms(11),
      letterSpacing: 0.5,
      gap: ms(3),
    },
  };

  const config = sizeConfig[size];
  const iconName = isCancelledStatus ? 'close-circle-outline' : (statusIcons[status] || 'help-circle-outline');
  const iconSize = size === 'xsmall' ? ms(6) : size === 'small' ? ms(16) : size === 'medium' ? ms(18) : ms(20);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor,
          borderRadius: config.borderRadius,
          paddingHorizontal: config.paddingHorizontal,
          paddingVertical: config.paddingVertical,
          gap: config.gap,
        },
      ]}>
      <Icon name={iconName} size={iconSize} color={textColor} />
      <Text
        numberOfLines={1}
        style={[
          styles.text,
          {
            color: textColor,
            fontSize: config.fontSize,
            letterSpacing: config.letterSpacing,
          },
        ]}>
        {displayLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    flexShrink: 0,
    flexGrow: 0,
    flexBasis: 'auto',
  },
  text: {
    fontFamily: fontFamily.semiBold,
    textTransform: 'uppercase',
    flexShrink: 0,
    flexGrow: 0,
  },
});

export default StatusBadge;
