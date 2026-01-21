/**
 * StatusBadge Component
 * Polished, color-coded status indicator badges with subtle backgrounds
 * and strong, readable text colors.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from './Text';
import { OrderStatus, TruckStatus } from '../../types';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms } from '../../utils/responsive';

type BadgeSize = 'small' | 'medium' | 'large';

interface StatusBadgeProps {
  status: OrderStatus | TruckStatus | string;
  label?: string;
  size?: BadgeSize;
}

const statusLabels: Record<string, string> = {
  NORMAL: 'Normal',
  WILL_CALL: 'Will Call',
  WEATHER_PERMITTING: 'Weather',
  HOLD: 'On Hold',
  COMPLETED: 'Completed',
  WAIT_LIST: 'Wait List',
  PRE_POUR: 'Pre-Pour',
  IN_PROCESS: 'In Progress',
  CANCELLED: 'Cancelled',
  DELAYED: 'Delayed',
  ENRT: 'En Route',
  ONSIT: 'On Site',
  LOADING: 'Loading',
  DISPATCHED: 'Dispatched',
  RETURNING: 'Returning',
};

// Status color configuration with text and background opacity
interface StatusColorConfig {
  text: string;
  textDark: string; // Text color for dark mode (usually same or slightly adjusted)
  bgOpacity: number; // Background opacity (0.08 - 0.12)
}

const statusColors: Record<string, StatusColorConfig> = {
  // Red statuses - Delayed, Cancelled
  DELAYED: {
    text: colors.statusBadge.red.text,
    textDark: colors.statusBadge.red.textDark,
    bgOpacity: 0.1,
  },
  CANCELLED: {
    text: colors.statusBadge.red.text,
    textDark: colors.statusBadge.red.textDark,
    bgOpacity: 0.1,
  },
  // Orange/Amber statuses - Pre-Pour, Will Call, Weather
  PRE_POUR: {
    text: colors.statusBadge.amber.text,
    textDark: colors.statusBadge.amber.textDark,
    bgOpacity: 0.1,
  },
  WILL_CALL: {
    text: colors.statusBadge.amber.text,
    textDark: colors.statusBadge.amber.textDark,
    bgOpacity: 0.1,
  },
  WEATHER_PERMITTING: {
    text: colors.statusBadge.amber.text,
    textDark: colors.statusBadge.amber.textDark,
    bgOpacity: 0.1,
  },
  // Green statuses - Completed
  COMPLETED: {
    text: colors.statusBadge.green.text,
    textDark: colors.statusBadge.green.textDark,
    bgOpacity: 0.1,
  },
  // Blue statuses - In Progress, On Site, Normal
  IN_PROCESS: {
    text: colors.statusBadge.blue.text,
    textDark: colors.statusBadge.blue.textDark,
    bgOpacity: 0.1,
  },
  ONSIT: {
    text: colors.statusBadge.blue.text,
    textDark: colors.statusBadge.blue.textDark,
    bgOpacity: 0.1,
  },
  NORMAL: {
    text: colors.statusBadge.blue.text,
    textDark: colors.statusBadge.blue.textDark,
    bgOpacity: 0.1,
  },
  // Purple statuses - En Route, Dispatched
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
  // Gray statuses - Hold, Wait List, Returning
  HOLD: {
    text: colors.statusBadge.gray.text,
    textDark: colors.statusBadge.gray.textDark,
    bgOpacity: 0.12,
  },
  WAIT_LIST: {
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

// Default color config for unknown statuses
const defaultColorConfig: StatusColorConfig = {
  text: colors.statusBadge.gray.text,
  textDark: colors.statusBadge.gray.textDark,
  bgOpacity: 0.1,
};

// Helper to convert hex to rgba
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
}) => {
  const { isDark } = useTheme();

  const colorConfig = statusColors[status] || defaultColorConfig;
  const displayLabel = label || statusLabels[status] || status;

  const textColor = isDark ? colorConfig.textDark : colorConfig.text;

  const baseColor = isDark ? colorConfig.textDark : colorConfig.text;
  const backgroundColor = hexToRgba(baseColor, colorConfig.bgOpacity);

  const sizeConfig = {
    small: {
      paddingHorizontal: ms(6),
      paddingVertical: ms(0),
      borderRadius: ms(4),
      fontSize: ms(9),
      letterSpacing: 0.3,
    },
    medium: {
      paddingHorizontal: ms(8),
      paddingVertical: ms(2),
      borderRadius: ms(6),
      fontSize: ms(10),
      letterSpacing: 0.4,
    },
    large: {
      paddingHorizontal: ms(12),
      paddingVertical: ms(3),
      borderRadius: ms(8),
      fontSize: ms(11),
      letterSpacing: 0.5,
    },
  };

  const config = sizeConfig[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor,
          borderRadius: config.borderRadius,
          paddingHorizontal: config.paddingHorizontal,
          paddingVertical: config.paddingVertical,
        },
      ]}>
      <Text
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
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontFamily: fontFamily.semiBold,
    textTransform: 'uppercase',
  },
});

export default StatusBadge;
