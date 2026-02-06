import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, vs } from '../../utils/responsive';
import Text from './Text';
import Icon from './Icon';

export interface EmptyViewProps {

  icon?: string;
  iconSize?: number;
  iconColor?: string;

  title?: string;
  subtitle?: string;

  actionLabel?: string;
  onAction?: () => void;

  compact?: boolean;
  style?: object;
}

export const EmptyViewPresets = {
  orders: {
    icon: 'clipboard-text-outline',
    title: 'No Orders Found',
    subtitle: 'There are no orders matching your criteria.',
  },
  tickets: {
    icon: 'ticket-outline',
    title: 'No Tickets Found',
    subtitle: 'There are no tickets available.',
  },
  notifications: {
    icon: 'bell-outline',
    title: 'No Notifications',
    subtitle: "You're all caught up! No new notifications.",
  },
  trucks: {
    icon: 'truck-alert',
    title: 'No Trucks Found',
    subtitle: 'There are no trucks available at the moment.',
  },
  search: {
    icon: 'magnify',
    title: 'No Results',
    subtitle: 'Try adjusting your search or filters.',
  },
  data: {
    icon: 'database-off-outline',
    title: 'No Data Available',
    subtitle: 'Data will appear here once available.',
  },
  network: {
    icon: 'wifi-off',
    title: 'No Connection',
    subtitle: 'Please check your internet connection and try again.',
  },
  error: {
    icon: 'alert-circle-outline',
    title: 'Something Went Wrong',
    subtitle: 'An error occurred. Please try again.',
  },
} as const;

export type EmptyViewPresetKey = keyof typeof EmptyViewPresets;

interface EmptyViewWithPresetProps extends Omit<EmptyViewProps, 'icon' | 'title' | 'subtitle'> {
  preset: EmptyViewPresetKey;

  title?: string;
  subtitle?: string;
  icon?: string;
}

export const EmptyView: React.FC<EmptyViewProps> = ({
  icon = 'inbox-outline',
  iconSize,
  iconColor,
  title = 'No Data',
  subtitle,
  actionLabel,
  onAction,
  compact = false,
  style,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const defaultIconSize = compact ? ms(48) : ms(64);
  const finalIconColor = iconColor || themeColors.text.hint;

  return (
    <View style={[styles.container, compact && styles.containerCompact, style]}>
      <View style={[styles.iconContainer, { backgroundColor: finalIconColor + '10' }]}>
        <Icon
          name={icon}
          size={iconSize || defaultIconSize}
          color={finalIconColor}
        />
      </View>
      <Text
        variant={compact ? 'body' : 'h3'}
        style={[
          styles.title,
          compact && styles.titleCompact,
          { color: themeColors.text.primary },
        ]}>
        {title}
      </Text>
      {subtitle && (
        <Text
          variant={compact ? 'caption' : 'body'}
          style={[
            styles.subtitle,
            compact && styles.subtitleCompact,
            { color: themeColors.text.secondary },
          ]}>
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary.main }]}
          onPress={onAction}
          activeOpacity={0.7}>
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const EmptyViewWithPreset: React.FC<EmptyViewWithPresetProps> = ({
  preset,
  title,
  subtitle,
  icon,
  ...props
}) => {
  const presetConfig = EmptyViewPresets[preset];

  return (
    <EmptyView
      icon={icon || presetConfig.icon}
      title={title || presetConfig.title}
      subtitle={subtitle || presetConfig.subtitle}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(32),
    paddingVertical: vs(48),
    minHeight: vs(300),
  },
  containerCompact: {
    paddingVertical: vs(24),
    minHeight: vs(150),
  },
  iconContainer: {
    width: ms(100),
    height: ms(100),
    borderRadius: ms(50),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(16),
  },
  title: {
    fontFamily: fontFamily.semiBold,
    textAlign: 'center',
    marginBottom: vs(8),
  },
  titleCompact: {
    marginBottom: vs(4),
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: ms(22),
    maxWidth: ms(280),
  },
  subtitleCompact: {
    maxWidth: ms(240),
  },
  actionButton: {
    marginTop: vs(24),
    paddingHorizontal: ms(24),
    paddingVertical: vs(12),
    borderRadius: ms(8),
  },
  actionButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    color: colors.common.white,
  },
});

export default EmptyView;
